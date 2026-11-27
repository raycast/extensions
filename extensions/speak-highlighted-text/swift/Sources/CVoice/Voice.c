#include "Voice.h"
#include "vendor/c-api.h"
#include <dlfcn.h>
#include <limits.h>
#include <stdio.h>
#include <stdbool.h>
#include <stdlib.h>

// one loaded model per worker, isolated from other phonemizer instances.
static const SherpaOnnxOfflineTts *engine;
static const SherpaOnnxGeneratedAudio *audio;
static __typeof__(&SherpaOnnxOfflineTtsGenerate) generate;
static __typeof__(&SherpaOnnxDestroyOfflineTtsGeneratedAudio) release;

static bool voice_open(const char *folder, int threads) {
    if (engine) return true;
    char library[PATH_MAX], model[PATH_MAX], voices[PATH_MAX], tokens[PATH_MAX], data[PATH_MAX], lexicon[PATH_MAX];
    snprintf(library, sizeof library, "%s/lib/libsherpa-onnx-c-api.dylib", folder);
    void *handle = dlopen(library, RTLD_NOW | RTLD_LOCAL);
    if (!handle) return false;
    __typeof__(&SherpaOnnxCreateOfflineTts) create = dlsym(handle, "SherpaOnnxCreateOfflineTts");
    generate = dlsym(handle, "SherpaOnnxOfflineTtsGenerate");
    release = dlsym(handle, "SherpaOnnxDestroyOfflineTtsGeneratedAudio");
    if (create && generate && release) {
        snprintf(model, sizeof model, "%s/model/model.int8.onnx", folder);
        snprintf(voices, sizeof voices, "%s/model/voices.bin", folder);
        snprintf(tokens, sizeof tokens, "%s/model/tokens.txt", folder);
        snprintf(data, sizeof data, "%s/model/espeak-ng-data", folder);
        snprintf(lexicon, sizeof lexicon, "%s/model/lexicon-us-en.txt", folder);
        SherpaOnnxOfflineTtsConfig config = {0};
        config.model.num_threads = threads;
        config.model.provider = "cpu";
        config.model.kokoro = (SherpaOnnxOfflineTtsKokoroModelConfig){
            .model=model, .voices=voices, .tokens=tokens, .data_dir=data,
            .lexicon=lexicon, .lang="en-us", .length_scale=1
        };
        config.max_num_sentences = 1;
        config.silence_scale = 0.2f;
        engine = create(&config);
    }
    if (!engine) dlclose(handle);
    return engine != NULL;
}

// frames use host-endian integers, since both pipe endpoints are on this mac.
int voice_worker(const char *folder, int threads, float speed) {
    if (!voice_open(folder, threads)) return 1;
    uint32_t length;
    while (fread(&length, sizeof length, 1, stdin) == 1) {
        if (length == 0 || length > 1024 * 1024) return 2;
        char *text = calloc(length + 1, 1);
        if (!text || fread(text, 1, length, stdin) != length) return 2;
        audio = generate(engine, text, 3, speed);
        free(text);
        if (!audio || audio->sample_rate != 24000 || audio->n <= 0) return 3;
        uint32_t count = audio->n;
        bool sent = fwrite(&count, sizeof count, 1, stdout) == 1 &&
                    fwrite(audio->samples, sizeof(float), count, stdout) == count;
        release(audio);
        if (!sent || fflush(stdout) != 0) return 4;
    }
    return 0;
}

/* global ObjC, $, Ref */
ObjC.import("AVFoundation");
ObjC.import("AppKit");

function run(args) {
  if (args[0] === "--voices") {
    const legacy = {};
    const oldVoices = $.NSSpeechSynthesizer.availableVoices;
    for (let i = 0; i < oldVoices.count; i++) {
      const identifier = oldVoices.objectAtIndex(i);
      const attributes = $.NSSpeechSynthesizer.attributesForVoice(identifier);
      legacy[ObjC.unwrap(identifier)] = ObjC.unwrap(attributes.objectForKey($.NSVoiceName));
    }
    const voices = $.AVSpeechSynthesisVoice.speechVoices;
    const result = [];
    for (let i = 0; i < voices.count; i++) {
      const voice = voices.objectAtIndex(i);
      const identifier = ObjC.unwrap(voice.identifier);
      const shortName = ObjC.unwrap(voice.name);
      const language = ObjC.unwrap(voice.language);
      const isSiri = /gryphon|siri/.test(identifier);
      const legacyName = legacy[identifier] || legacy[identifier.replace(".super-compact.", ".compact.")];
      const natural = identifier.indexOf(".natural.") >= 0 ? ", Natural" : "";
      result.push({
        identifier,
        name: legacyName || `${isSiri ? "Siri " : ""}${shortName} (${language}${natural})`,
        language,
        quality: Number(voice.quality) === 3 ? "premium" : Number(voice.quality) === 2 ? "enhanced" : "standard",
        legacyName,
        isSiri,
        shortName,
      });
    }
    return JSON.stringify(result);
  }
  if (args[0] !== "--speak") throw new Error("Expected --voices or --speak");
  const input = $.NSFileHandle.fileHandleWithStandardInput.readDataToEndOfFile;
  const request = JSON.parse(ObjC.unwrap($.NSString.alloc.initWithDataEncoding(input, $.NSUTF8StringEncoding)));
  const voice = $.AVSpeechSynthesisVoice.voiceWithIdentifier(request.identifier);
  if (voice.isNil()) throw new Error(`Voice is not available: ${request.identifier}`);
  const utterance = $.AVSpeechUtterance.speechUtteranceWithString(request.text);
  utterance.voice = voice;
  if (request.rate !== undefined) utterance.rate = Math.max(0, Math.min(1, (request.rate / 175) * 0.5));
  if (request.volume !== undefined) utterance.volume = Math.max(0, Math.min(1, request.volume));
  const synth = $.AVSpeechSynthesizer.alloc.init;
  const deadline = Date.now() + Math.max(300000, request.text.length * 2000);
  const wait = (condition) => {
    while (condition() && Date.now() < deadline) {
      $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.02));
    }
    if (condition()) throw new Error("Speech timed out");
  };
  if (!request.outputFile && !request.temporaryFile) {
    let done = false;
    let cancelled = false;
    ObjC.registerSubclass({
      name: "RaycastSpeechDelegate",
      protocols: ["AVSpeechSynthesizerDelegate"],
      methods: {
        "speechSynthesizer:didFinishSpeechUtterance:": function () {
          done = true;
        },
        "speechSynthesizer:didCancelSpeechUtterance:": function () {
          cancelled = true;
          done = true;
        },
      },
    });
    const delegate = $.RaycastSpeechDelegate.alloc.init;
    synth.delegate = delegate;
    synth.speakUtterance(utterance);
    wait(() => !done);
    if (cancelled) throw new Error("Speech was cancelled");
    return;
  }
  const url = $.NSURL.fileURLWithPath(request.outputFile || request.temporaryFile);
  let done = false;
  let failure;
  let file;
  let frames = 0;
  synth.writeUtteranceToBufferCallback(
    utterance,
    ObjC.block(["void", ["id"]], (buffer) => {
      if (Number(buffer.frameLength) === 0) {
        done = true;
        return;
      }
      if (failure) return;
      try {
        const error = Ref();
        if (!file) file = $.AVAudioFile.alloc.initForWritingSettingsError(url, buffer.format.settings, error);
        if (file.isNil() || !file.writeFromBufferError(buffer, error))
          throw new Error("Could not write synthesized audio");
        frames += Number(buffer.frameLength);
      } catch (error) {
        failure = error;
        done = true;
      }
    }),
  );
  wait(() => !done);
  if (failure) throw failure;
  if (!frames) throw new Error("Voice generated no audio");
  file = undefined;
  if (!request.outputFile) {
    const error = Ref();
    const player = $.AVAudioPlayer.alloc.initWithContentsOfURLError(url, error);
    if (player.isNil()) throw new Error("Could not open synthesized audio");
    if (request.audioDeviceUID) player.currentDevice = request.audioDeviceUID;
    if (!player.play) throw new Error("Could not play synthesized audio");
    wait(() => player.playing);
  }
}

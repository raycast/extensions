(function () {
  let context;
  let masterGain;
  let compressor;
  let noiseBuffer;
  let ambientState;

  function getContext() {
    if (context) {
      return context;
    }

    const AudioContextConstructor =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextConstructor) {
      return undefined;
    }

    context = new AudioContextConstructor();
    masterGain = context.createGain();
    compressor = context.createDynamicsCompressor();

    masterGain.gain.value = 0.34;
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 7;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.22;

    masterGain.connect(compressor);
    compressor.connect(context.destination);

    return context;
  }

  async function prepareContext() {
    const audioContext = getContext();

    if (!audioContext) {
      return undefined;
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume().catch(() => undefined);
    }

    return audioContext;
  }

  function getNoiseBuffer(audioContext) {
    if (noiseBuffer) {
      return noiseBuffer;
    }

    const duration = 3.8;
    const sampleCount = Math.floor(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(
      1,
      sampleCount,
      audioContext.sampleRate,
    );
    const data = buffer.getChannelData(0);
    let last = 0;

    for (let index = 0; index < sampleCount; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.72 + white * 0.28;
      data[index] = white * 0.72 + last * 0.28;
    }

    noiseBuffer = buffer;
    return noiseBuffer;
  }

  function clampFrequency(value) {
    return Math.max(20, value);
  }

  function envelope(gain, start, duration, level, options = {}) {
    const attack = options.attack ?? 0.025;
    const release = options.release ?? Math.min(0.38, duration * 0.45);
    const end = start + duration;
    const sustainEnd = Math.max(start + attack + 0.01, end - release);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + attack);
    gain.gain.setValueAtTime(level, sustainEnd);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
  }

  function connectOutput(node, audioContext, options = {}) {
    let output = node;

    if (typeof options.pan === "number" && audioContext.createStereoPanner) {
      const panner = audioContext.createStereoPanner();
      panner.pan.value = options.pan;
      output.connect(panner);
      output = panner;
    }

    output.connect(options.destination ?? masterGain);
  }

  function playTone(audioContext, options) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const start = options.start ?? audioContext.currentTime;
    const duration = options.duration;
    const end = start + duration;

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(clampFrequency(options.from), start);

    if (options.curve === "exponential") {
      oscillator.frequency.exponentialRampToValueAtTime(
        clampFrequency(options.to ?? options.from),
        end,
      );
    } else {
      oscillator.frequency.linearRampToValueAtTime(
        clampFrequency(options.to ?? options.from),
        end,
      );
    }

    if (options.detune) {
      oscillator.detune.setValueAtTime(options.detune, start);
    }

    filter.type = options.filterType ?? "lowpass";
    filter.frequency.setValueAtTime(options.filterFrequency ?? 2600, start);

    if (options.filterTo) {
      filter.frequency.linearRampToValueAtTime(options.filterTo, end);
    }

    filter.Q.value = options.filterQ ?? 0.9;
    envelope(gain, start, duration, options.gain ?? 0.05, options);

    oscillator.connect(filter);
    filter.connect(gain);
    connectOutput(gain, audioContext, options);

    oscillator.start(start);
    oscillator.stop(end + 0.04);
  }

  function playNoise(audioContext, options) {
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const start = options.start ?? audioContext.currentTime;
    const duration = options.duration;
    const end = start + duration;

    source.buffer = getNoiseBuffer(audioContext);
    source.loop = true;
    source.playbackRate.value = options.rate ?? 1;

    filter.type = options.filterType ?? "bandpass";
    filter.frequency.setValueAtTime(options.from ?? 900, start);

    if (options.to) {
      filter.frequency.linearRampToValueAtTime(options.to, end);
    }

    filter.Q.value = options.q ?? 2.4;
    envelope(gain, start, duration, options.gain ?? 0.04, options);

    source.connect(filter);
    filter.connect(gain);
    connectOutput(gain, audioContext, options);

    source.start(start, Math.random() * 2.4);
    source.stop(end + 0.04);
  }

  function playDataTick(audioContext, start, options = {}) {
    const frequency = options.frequency ?? 520 + Math.random() * 7200;
    const duration = options.duration ?? 0.018 + Math.random() * 0.052;
    const gain = options.gain ?? 0.012 + Math.random() * 0.02;

    playTone(audioContext, {
      type: Math.random() > 0.35 ? "square" : "sawtooth",
      from: frequency,
      to: frequency * (0.78 + Math.random() * 0.72),
      duration,
      start,
      gain,
      attack: 0.003,
      release: duration * 0.7,
      filterType: "highpass",
      filterFrequency: 850 + Math.random() * 2600,
      filterQ: 0.8,
      pan: Math.random() * 1.8 - 0.9,
      destination: options.destination,
    });
  }

  function playDataCloud(audioContext, start, duration, direction) {
    const count = Math.floor(duration * 38);

    for (let index = 0; index < count; index += 1) {
      const progress = index / count;
      const jitter = Math.random() * 0.045;
      const time =
        start +
        (direction === "reverse" ? 1 - progress : progress) * duration +
        jitter;

      playDataTick(audioContext, time, {
        frequency:
          direction === "reverse"
            ? 7600 - progress * 5200 + Math.random() * 1100
            : 420 + progress * 6200 + Math.random() * 1400,
        gain: 0.008 + Math.random() * 0.018,
        duration: 0.012 + Math.random() * 0.044,
      });
    }
  }

  function playMetallicSweep(audioContext, start, options = {}) {
    const base = options.base ?? 6600;
    const target = options.target ?? 640;
    const duration = options.duration ?? 1.25;
    const direction = options.direction ?? "down";
    const gain = options.gain ?? 0.024;

    for (let index = 0; index < 7; index += 1) {
      const offset = index * 0.035 + Math.random() * 0.035;
      const ratio = 1 + index * 0.23;
      const from = direction === "down" ? base / ratio : target * ratio;
      const to = direction === "down" ? target * ratio : base / ratio;

      playTone(audioContext, {
        type: index % 2 === 0 ? "sawtooth" : "triangle",
        from,
        to,
        duration: duration + Math.random() * 0.18,
        start: start + offset,
        gain: gain / (1 + index * 0.38),
        attack: 0.018,
        release: 0.44,
        filterType: "bandpass",
        filterFrequency: Math.min(7600, from),
        filterTo: Math.max(420, to),
        filterQ: 6 + index * 0.7,
        detune: (Math.random() - 0.5) * 22,
        pan: index % 2 === 0 ? -0.35 : 0.35,
      });
    }
  }

  function playTelemetryBand(audioContext, start, options = {}) {
    const duration = options.duration ?? 4.4;
    const bands = options.bands ?? [8800, 10400, 11800, 14200];
    const interval = options.interval ?? 0.12;

    for (let bandIndex = 0; bandIndex < bands.length; bandIndex += 1) {
      for (let time = 0; time < duration; time += interval) {
        if (Math.random() < 0.26) {
          continue;
        }

        const pulseStart =
          start + time + bandIndex * 0.018 + Math.random() * 0.025;

        playTone(audioContext, {
          type: Math.random() > 0.6 ? "square" : "triangle",
          from: bands[bandIndex] + Math.random() * 220,
          to: bands[bandIndex] - 120 - Math.random() * 380,
          duration: 0.026 + Math.random() * 0.035,
          start: pulseStart,
          gain: 0.008 + Math.random() * 0.018,
          attack: 0.002,
          release: 0.024,
          filterType: "highpass",
          filterFrequency: 5200,
          filterQ: 0.7,
          pan: bandIndex % 2 === 0 ? -0.42 : 0.42,
        });
      }
    }
  }

  function playHarmonicGrid(audioContext, start, options = {}) {
    const duration = options.duration ?? 4.5;
    const roots = options.roots ?? [48, 96, 192, 384, 768];

    for (let index = 0; index < roots.length; index += 1) {
      playTone(audioContext, {
        type: index < 2 ? "sawtooth" : "triangle",
        from: roots[index] * (1 + Math.random() * 0.015),
        to: roots[index] * (0.82 + Math.random() * 0.08),
        duration: duration - index * 0.08,
        start: start + index * 0.035,
        gain: (options.gain ?? 0.05) / (1 + index * 0.5),
        attack: 0.08,
        release: 1.1,
        filterType: "bandpass",
        filterFrequency: roots[index] * 2.6,
        filterTo: roots[index] * 1.7,
        filterQ: 3.6 + index * 0.55,
        detune: (Math.random() - 0.5) * 18,
        pan: index % 2 === 0 ? -0.16 : 0.16,
      });
    }
  }

  function startAmbientSource(audioContext, output, options) {
    const source = audioContext.createBufferSource();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const start = options.start ?? audioContext.currentTime;

    source.buffer = getNoiseBuffer(audioContext);
    source.loop = true;
    source.playbackRate.value = options.rate ?? 1;
    filter.type = options.filterType ?? "bandpass";
    filter.frequency.setValueAtTime(options.frequency, start);
    filter.Q.value = options.q ?? 1.2;
    gain.gain.setValueAtTime(options.gain, start);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(start, Math.random() * 2.8);

    return { source, filter };
  }

  function startAmbientTone(audioContext, output, options) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const start = options.start ?? audioContext.currentTime;

    oscillator.type = options.type ?? "sine";
    oscillator.frequency.setValueAtTime(options.frequency, start);

    if (options.detune) {
      oscillator.detune.setValueAtTime(options.detune, start);
    }

    filter.type = options.filterType ?? "lowpass";
    filter.frequency.setValueAtTime(options.filterFrequency, start);
    filter.Q.value = options.q ?? 0.8;
    gain.gain.setValueAtTime(options.gain, start);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    oscillator.start(start);

    return { source: oscillator, filter };
  }

  function scheduleAmbientMatrixEvents(audioContext) {
    if (!ambientState || ambientState.stopping) {
      return;
    }

    const now = audioContext.currentTime + 0.06;
    const horizon = 1.45;
    const tickCount = 12 + Math.floor(Math.random() * 10);

    for (let index = 0; index < tickCount; index += 1) {
      playDataTick(audioContext, now + Math.random() * horizon, {
        destination: ambientState.output,
        frequency: 780 + Math.random() * 9800,
        gain: 0.004 + Math.random() * 0.009,
        duration: 0.01 + Math.random() * 0.04,
      });
    }

    if (Math.random() < 0.72) {
      playNoise(audioContext, {
        destination: ambientState.output,
        start: now + Math.random() * 0.9,
        duration: 0.08 + Math.random() * 0.18,
        from: 5200 + Math.random() * 3600,
        to: 12200 + Math.random() * 2200,
        gain: 0.012 + Math.random() * 0.014,
        q: 4.2,
        attack: 0.01,
        release: 0.12,
        pan: Math.random() * 1.4 - 0.7,
      });
    }

    if (Math.random() < 0.34) {
      playTone(audioContext, {
        destination: ambientState.output,
        type: "triangle",
        from: 180 + Math.random() * 220,
        to: 90 + Math.random() * 120,
        duration: 0.6 + Math.random() * 0.85,
        start: now + Math.random() * 0.7,
        gain: 0.009 + Math.random() * 0.01,
        attack: 0.08,
        release: 0.44,
        filterType: "bandpass",
        filterFrequency: 640,
        filterQ: 2.2,
      });
    }

    ambientState.eventTimer = window.setTimeout(
      () => scheduleAmbientMatrixEvents(audioContext),
      850 + Math.random() * 520,
    );
  }

  function driftAmbientFilters(audioContext) {
    if (!ambientState || ambientState.stopping) {
      return;
    }

    const start = audioContext.currentTime;

    for (const node of ambientState.nodes) {
      const filter = node.filter;

      if (!filter) {
        continue;
      }

      const current = filter.frequency.value;
      const wobble = current * (0.82 + Math.random() * 0.36);

      filter.frequency.cancelScheduledValues(start);
      filter.frequency.setValueAtTime(current, start);
      filter.frequency.linearRampToValueAtTime(wobble, start + 2.4);
    }

    ambientState.driftTimer = window.setTimeout(
      () => driftAmbientFilters(audioContext),
      1800 + Math.random() * 900,
    );
  }

  function startMatrixAmbience(audioContext, start) {
    if (ambientState && !ambientState.stopping) {
      return;
    }

    const output = audioContext.createGain();
    const nodes = [];
    const targetLevel = 0.82;
    const fadeStart = start ?? audioContext.currentTime;

    output.gain.setValueAtTime(0.0001, fadeStart);
    output.gain.linearRampToValueAtTime(targetLevel, fadeStart + 2.4);
    output.connect(masterGain);

    ambientState = {
      output,
      nodes,
      targetLevel,
      stopping: false,
    };

    nodes.push(
      startAmbientSource(audioContext, output, {
        start: fadeStart,
        frequency: 8800,
        gain: 0.028,
        q: 0.85,
        rate: 1.12,
      }),
      startAmbientSource(audioContext, output, {
        start: fadeStart + 0.08,
        frequency: 1680,
        gain: 0.022,
        q: 1.4,
        rate: 0.74,
      }),
      startAmbientTone(audioContext, output, {
        start: fadeStart,
        type: "sawtooth",
        frequency: 46,
        gain: 0.032,
        filterFrequency: 180,
        q: 0.8,
      }),
      startAmbientTone(audioContext, output, {
        start: fadeStart + 0.14,
        type: "triangle",
        frequency: 92,
        detune: -9,
        gain: 0.016,
        filterType: "bandpass",
        filterFrequency: 260,
        q: 2.6,
      }),
      startAmbientTone(audioContext, output, {
        start: fadeStart + 0.22,
        type: "triangle",
        frequency: 184,
        detune: 11,
        gain: 0.01,
        filterType: "bandpass",
        filterFrequency: 720,
        q: 2,
      }),
    );

    scheduleAmbientMatrixEvents(audioContext);
    driftAmbientFilters(audioContext);
  }

  function stopMatrixAmbience(audioContext, start, fadeDuration = 1.6) {
    if (!ambientState) {
      return;
    }

    const state = ambientState;
    const stopAt = start ?? audioContext.currentTime;

    state.stopping = true;
    window.clearTimeout(state.eventTimer);
    window.clearTimeout(state.driftTimer);

    state.output.gain.cancelScheduledValues(stopAt);
    state.output.gain.setValueAtTime(state.output.gain.value || 0.0001, stopAt);
    state.output.gain.exponentialRampToValueAtTime(
      0.0001,
      stopAt + fadeDuration,
    );

    window.setTimeout(
      () => {
        for (const node of state.nodes) {
          try {
            node.source.stop();
          } catch {
            // Already stopped.
          }
        }

        state.output.disconnect();

        if (ambientState === state) {
          ambientState = undefined;
        }
      },
      Math.ceil((fadeDuration + 0.2) * 1000),
    );
  }

  async function playEnterSound(enabled = true) {
    if (!enabled) {
      return;
    }

    const audioContext = await prepareContext();

    if (!audioContext) {
      return;
    }

    const start = audioContext.currentTime + 0.04;
    startMatrixAmbience(audioContext, start + 1.4);

    playTone(audioContext, {
      type: "sine",
      from: 39,
      to: 58,
      duration: 3.15,
      start,
      gain: 0.13,
      attack: 0.28,
      release: 0.95,
      filterFrequency: 120,
      filterQ: 0.6,
    });

    playTone(audioContext, {
      type: "sawtooth",
      from: 96,
      to: 144,
      duration: 2.35,
      start: start + 0.18,
      gain: 0.038,
      attack: 0.18,
      release: 0.74,
      filterFrequency: 760,
      filterTo: 1120,
      filterQ: 1.6,
      pan: -0.12,
    });

    playNoise(audioContext, {
      start: start + 0.08,
      duration: 2.95,
      from: 900,
      to: 11800,
      gain: 0.07,
      q: 0.92,
      attack: 0.22,
      release: 1.1,
      pan: 0.18,
    });

    playNoise(audioContext, {
      start: start + 0.26,
      duration: 2.25,
      from: 8600,
      to: 14600,
      gain: 0.038,
      q: 1.8,
      attack: 0.08,
      release: 0.7,
      rate: 1.4,
      pan: -0.22,
    });

    playMetallicSweep(audioContext, start + 0.46, {
      base: 7200,
      target: 520,
      duration: 1.55,
      gain: 0.032,
      direction: "down",
    });

    playDataCloud(audioContext, start + 0.18, 2.45, "forward");

    for (const offset of [0.88, 1.22, 1.58, 1.95]) {
      playNoise(audioContext, {
        start: start + offset,
        duration: 0.16,
        from: 2400,
        to: 12500,
        gain: 0.048,
        q: 5.2,
        attack: 0.006,
        release: 0.13,
        pan: Math.random() * 1.2 - 0.6,
      });
    }

    playTone(audioContext, {
      type: "triangle",
      from: 1320,
      to: 2080,
      duration: 0.7,
      start: start + 2.02,
      gain: 0.036,
      attack: 0.035,
      release: 0.38,
      filterFrequency: 7200,
      filterQ: 1.1,
    });

    playNoise(audioContext, {
      start: start + 2.18,
      duration: 1.16,
      from: 10400,
      to: 6800,
      gain: 0.025,
      q: 1.1,
      attack: 0.18,
      release: 0.78,
      rate: 1.2,
      pan: 0.08,
    });

    playTone(audioContext, {
      type: "triangle",
      from: 820,
      to: 340,
      duration: 1.08,
      start: start + 2.24,
      gain: 0.018,
      attack: 0.2,
      release: 0.72,
      filterType: "bandpass",
      filterFrequency: 920,
      filterTo: 360,
      filterQ: 2.1,
    });
  }

  async function playExitSound(sessionDurationMs = 0) {
    const audioContext = await prepareContext();

    if (!audioContext) {
      return;
    }

    const start = audioContext.currentTime + 0.015;
    const duration = 4.75;
    const depth = Math.min(1, Math.max(0, sessionDurationMs / 600000));

    stopMatrixAmbience(audioContext, start, 1.45);

    playNoise(audioContext, {
      start,
      duration,
      from: 6800,
      to: 15600,
      gain: 0.13,
      q: 0.72,
      attack: 0.035,
      release: 1.05,
      rate: 1.95,
      pan: -0.12,
    });

    playNoise(audioContext, {
      start: start + 0.04,
      duration: duration - 0.1,
      from: 620,
      to: 4200,
      gain: 0.095 + depth * 0.025,
      q: 1.05,
      attack: 0.04,
      release: 1.25,
      rate: 0.86,
      pan: 0.18,
    });

    playTone(audioContext, {
      type: "sawtooth",
      from: 68 + depth * 38,
      to: 34,
      duration: duration,
      start,
      gain: 0.115 + depth * 0.035,
      attack: 0.05,
      release: 1.35,
      curve: "exponential",
      filterFrequency: 240,
      filterTo: 110,
      filterQ: 1.1,
    });

    playHarmonicGrid(audioContext, start + 0.08, {
      duration: duration - 0.18,
      gain: 0.062 + depth * 0.018,
    });

    playTelemetryBand(audioContext, start + 0.18, {
      duration: duration - 0.32,
      interval: 0.115,
      bands: [7800, 9000, 10200, 11600, 12800, 14400],
    });

    playDataCloud(audioContext, start + 0.12, duration - 0.55, "reverse");

    for (const offset of [0.08, 0.72, 1.46, 2.22, 2.88, 3.48]) {
      playNoise(audioContext, {
        start: start + offset,
        duration: 0.18 + Math.random() * 0.1,
        from: 4200 + Math.random() * 2200,
        to: 13200 + Math.random() * 1600,
        gain: 0.06 + Math.random() * 0.045,
        q: 4.8,
        attack: 0.004,
        release: 0.14,
        pan: Math.random() * 1.6 - 0.8,
      });
    }

    playMetallicSweep(audioContext, start + 0.58, {
      base: 14800,
      target: 920,
      duration: 2.55,
      gain: 0.032 + depth * 0.012,
      direction: "down",
    });

    playNoise(audioContext, {
      start: start + 3.04,
      duration: duration - 3.04,
      from: 11800,
      to: 7200,
      gain: 0.052 + depth * 0.012,
      q: 0.85,
      attack: 0.42,
      release: 1.42,
      rate: 1.34,
      pan: -0.08,
    });

    playNoise(audioContext, {
      start: start + 3.1,
      duration: duration - 3.1,
      from: 1200,
      to: 260,
      gain: 0.058 + depth * 0.014,
      q: 1.35,
      attack: 0.44,
      release: 1.52,
      rate: 0.72,
      pan: 0.12,
    });

    playTone(audioContext, {
      type: "triangle",
      from: 420 + depth * 80,
      to: 170,
      duration: duration - 3.16,
      start: start + 3.16,
      gain: 0.026 + depth * 0.008,
      attack: 0.36,
      release: 1.38,
      filterType: "bandpass",
      filterFrequency: 880,
      filterTo: 260,
      filterQ: 2.4,
    });
  }

  window.matrixAudio = {
    playEnterSound,
    playExitSound,
  };
})();

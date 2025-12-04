//@osa-lang:JavaScript
(() => {
  ObjC.import("AppKit");
  ObjC.import("Speech");
  ObjC.import("AVFoundation");
  ObjC.import("objc");

  const audioEngine = $.AVAudioEngine.alloc.init;
  const audioSession = $.objc_getClass("AVAudioSession").sharedInstance;

  audioSession.setCategoryModeOptionsError(
    $.AVAudioSessionCategoryRecord,
    $.AVAudioSessionModeMeasurement,
    $.AVAudioSessionCategoryOptionDuckOthers,
    null
  );
  audioSession.setActiveWithOptionsError(
    true,
    $.AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation,
    null
  );
  const inputNode = audioEngine.inputNode;

  let recognitionRequest = $.SFSpeechAudioBufferRecognitionRequest.alloc.init;

  const recordingFormat = inputNode.outputFormatForBus(0);
  inputNode.installTapOnBusBufferSizeFormatBlock(
    0,
    1024,
    recordingFormat,
    (buffer, when) => {
      recognitionRequest.appendAudioPCMBuffer(buffer);
    }
  );

  audioEngine.startAndReturnError(null);

  let prevRes = "";
  let res = "";
  let iter = 0;

  const speechRecognizer = $.SFSpeechRecognizer.alloc.init;
  let recognitionTask =
    speechRecognizer.recognitionTaskWithRequestResultHandler(
      recognitionRequest,
      (result, error) => {
        if (error.localizedDescription) {
          //console.log(error.localizedDescription.js);
		  null
        } else {
          const newRes = ObjC.unwrap(result.bestTranscription.formattedString);
          console.log(newRes.substring(res.length > 0 ? res.length + 1 : 0));
          res = newRes;
        }
      }
    );

  const waitWhileListening = () => {
  	const duration = 1;
	const startDate = $.NSDate.date;
  	while (startDate.timeIntervalSinceNow > -duration - 1) {
    	runLoop = $.NSRunLoop.currentRunLoop;
    	today = $.NSDate.dateWithTimeIntervalSinceNow(0.1);
    	runLoop.runUntilDate(today);
  	}

	if (prevRes == "" || res != prevRes) {
		prevRes = res;
		waitWhileListening()
	} else {
		const debounceStartDate = $.NSDate.date;
		const debounceDuration = 1
		while (debounceStartDate.timeIntervalSinceNow > -debounceDuration - 0.5) {
    		runLoop = $.NSRunLoop.currentRunLoop;
    		today = $.NSDate.dateWithTimeIntervalSinceNow(0.1);
    		runLoop.runUntilDate(today);
		}

		if (prevRes == "" || res != prevRes) {
			prevRes = res;
			waitWhileListening()
		}
	}
  }
  waitWhileListening()

  audioEngine.stop;
  inputNode.removeTapOnBus(0);
  recognitionTask.finish;

  return res;
})();

//@osa-lang:JavaScript
(() => {
  ObjC.import("AppKit");

  const args = $.NSProcessInfo.processInfo.arguments
  const isLoading = args.js[4].js
  let again = true
  let moreData = true;

  let content = ""
  const contentToSpeak = []
  let startDate = $.NSDate.date;

  const synthesizer = $.NSSpeechSynthesizer.alloc.init

  const speakContent = async () => {
  	while (synthesizer.speaking && again) {
		if (moreData) {
			try {
				const input = $.NSFileHandle.fileHandleWithStandardInput
				const availableData = input.availableData
				const inputData = $.NSData.dataWithData(availableData)
				const res = $.NSString.alloc.initWithDataEncoding(inputData, $.NSUTF8StringEncoding).js
				input.synchronizeAndReturnError(null)

				if (res.includes("$$stop$$")) {
					synthesizer.stopSpeaking
					again = false;
					return false
				} else if (res.startsWith("$$msg$$")) {
					if (res.includes("$$endData$$")) {
						moreData = false;
					}

					let newContent = res.split("$$msg$$").at(-1)
					newContent = newContent.replaceAll("$$endData$$", "").replaceAll(/\s+/g, " ").trim().replaceAll(content, "")

					console.log("res", res)
					console.log("new", newContent);

					if (newContent.length > 20 && content.includes(newContent)) {
						null
					}
					if (newContent != "Loading response..." && newContent != "Analyzing files...") {
						content += newContent
						contentToSpeak.push(newContent)
					}
				} else if (res.includes("$$endData$$")) {
					moreData = false;
				}
			} catch (error) {
					console.log(error)
			}
		}

		runLoop = $.NSRunLoop.currentRunLoop;
    	today = $.NSDate.dateWithTimeIntervalSinceNow(0.1);
    	runLoop.runUntilDate(today);

		startDate = $.NSDate.date;
	}

  	if (contentToSpeak.length > 0 && again) {
		const nextContent = contentToSpeak.shift()
		if (nextContent?.length) {
			synthesizer.startSpeakingString(nextContent)
		}
	}
	return true
  }

  const waitWhileListening = () => {
  	const duration = 7;
  	while (again && ((content == "" && isLoading == "true" && startDate.timeIntervalSinceNow > -duration - 1) || contentToSpeak.length > 0 || startDate.timeIntervalSinceNow > -duration - 1)) {

		if (moreData) {
			try {
				const input = $.NSFileHandle.fileHandleWithStandardInput
				const availableData = input.availableData
				const inputData = $.NSData.dataWithData(availableData)
				const res = $.NSString.alloc.initWithDataEncoding(inputData, $.NSUTF8StringEncoding).js
				input.synchronizeAndReturnError(null)

				if (res.includes("$$stop$$")) {
					again = false;
					synthesizer.stopSpeaking
					return
				} else if (res.startsWith("$$msg$$")) {
					if (res.includes("$$endData$$")) {
						moreData = false;
					}

					let newContent = res.split("$$msg$$").at(-1)
					newContent = newContent.replaceAll("$$endData$$", "").replaceAll(/\s+/g, " ").trim().replaceAll(content, "")

					console.log("res", res)
					console.log("new", newContent);

					const firstPart = newContent.substring(0, newContent.length / 2 - 1)
					const secondPart = newContent.substring(newContent.length / 2 - 1)
					if (secondPart.includes(firstPart.trim())) {
						let newContent = secondPart
					}

					if (newContent.length > 20 && content.includes(newContent)) {
						return;
					}
					if (newContent != "Loading response..." && newContent != "Analyzing files...") {
						content += newContent
					}
					contentToSpeak.push(newContent)
					startDate = $.NSDate.date;
				} else if (res.includes("$$endData$$")) {
					moreData = false;
				}
			} catch (error) {
				console.log(error);
			}
		}

		speakContent()
  	}
  }
  waitWhileListening()
})()
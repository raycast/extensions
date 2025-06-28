//@osa-lang:JavaScript
ObjC.import("Foundation");
ObjC.import("ApplicationServices");

supportedTypes = {
	png: true,
	jpg: true,
	jpeg: true,
	tif: true,
	tiff: true,
	heif: true,
	heifs: true,
	heic: true,
	heics: true,
	acvi: true,
	acvs: true,
	hif: true,
	gif: true,
	ico: true,
	icns: true,
	astc: true,
	bmp: true,
	dds: true,
	exr: true,
	jp2: true,
	j2c: true,
	jpf: true,
	j2k: true,
	jpx: true,
	ktx: true,
	pbm: true,
	pgm: true,
	ppm: true,
	pnm: true,
	pfm: true,
	psd: true,
	pvr: true,
	tga: true,
	webp: true,
	svg: true,
	pdf: true,
	avif: true,
};

function requestAutomationPermissionForApplication_(applicationName) {
	const currentApplication = Application.currentApplication();
	currentApplication.includeStandardAdditions = true;
	const alert = currentApplication.displayAlert('Permission Needed', { message: 'To use Image Modification on selected images in ' + applicationName + ', you must allow Raycast to control ' + applicationName + ' and System Events in System Settings > Privacy & Security > Automation.\n\nDue to limitations in ForkLift\'s scripting support, you must also allow Raycast to interface with your Mac\'s Accessibility subsystem by enabling it under System Settings > Privacy & Security > Accessibility.', buttons: ['Dismiss', 'Open Privacy Settings']});
	const btn = alert.buttonReturned;
	if (btn == 'Open Privacy Settings') {
		currentApplication.openLocation('x-apple.systempreferences:com.apple.preference.security?Privacy');
	}
	return btn;
}

function imagePathsForItemsInSelection(selection) {
	const imagePaths = [];
	for (const filePath of selection) {
		const fileExtension = filePath.slice(filePath.lastIndexOf('.') + 1).toLowerCase();
		if (supportedTypes[fileExtension]) {
			imagePaths.push(filePath);
		}
	}
	return imagePaths;
}

/**
 * Gets the top-level accessibility element of the application with the specified bundle ID.
 */
function AXGetElementForApplicationWithId(bundleId) {
	const se = Application("System Events");
	const forkliftProcess = se.applicationProcesses.whose({"bundleIdentifier": { "=": bundleId}}).first();
	const pid = forkliftProcess.unixId();
	const appRef = $.AXUIElementCreateApplication(pid);
	return {
		ref: appRef,
		deref: ObjC.castRefToObject(appRef)
	};
}

/**
 * Gets the list of window elements of the given application. Windows may be hidden, minimized, or otherwise not visible on screen.
 */
function AXGetWindowsOfApplication(AXApplication) {
	const windowsRef = Ref();
	const AXWindows = $.CFStringCreateWithCString(null, "AXWindows", $.kCFStringEncodingMacRoman);
	$.AXUIElementCopyAttributeValue(AXApplication, AXWindows, windowsRef);
	return {
		ref: windowsRef,
		deref: ObjC.castRefToObject(windowsRef[0])
	};
}

/**
 * Activates the window at the given index.
 */
function AXActivateWindowAtIndexInApplication(index, AXApplication) {
	const win = AXGetWindowsOfApplication(AXApplication).deref.objectAtIndex(index);
	const AXRaise = $.CFStringCreateWithCString(null, "AXRaise", $.kCFStringEncodingMacRoman);
	$.AXUIElementPerformAction(win, AXRaise);
}

/**
 * Gets the focused accessibility element (which may be an entire window, a subview, or an input field).
 */
function AXGetFocusedElementOfApplication(AXApplication) {
	const focusedElementRef = Ref();
	const AXFocusedUIElement = $.CFStringCreateWithCString(null, "AXFocusedUIElement", $.kCFStringEncodingMacRoman);
	res = $.AXUIElementCopyAttributeValue(AXApplication, AXFocusedUIElement, focusedElementRef);
 	return {
		ref: focusedElementRef,
		deref: ObjC.castRefToObject(focusedElementRef[0])
	};
}

/**
 * Gets the selected child elements of a UI element (usually the focused element; see `AXGetFocusedElementOfApplication`).
 */
function AXGetSelectedChildrenOfElement(element) {
	const selectedChildrenRef = Ref();
	const AXSelectedChildren = $.CFStringCreateWithCString(null, "AXSelectedChildren", $.kCFStringEncodingMacRoman);
	res = $.AXUIElementCopyAttributeValue(element, AXSelectedChildren, selectedChildrenRef);
	return {
		ref: selectedChildrenRef,
		deref: ObjC.castRefToObject(selectedChildrenRef[0])
	};
}

/**
 * Gets the value of a UI element. This usually correponds to the text displayed by the element or the text representation of a text-representable value, such as a number or date.
 */
function AXGetValueOfElement(element) {
	const valueRef = Ref();
	const AXValue = $.CFStringCreateWithCString(null, "AXValue", $.kCFStringEncodingMacRoman);
	res = $.AXUIElementCopyAttributeValue(element, AXValue, valueRef);
	return {
		ref: valueRef,
		deref: ObjC.castRefToObject(valueRef[0]).js
	};
}

/**
 * Gets the URL of the current directory open in the ForkLift's frontmost window.
 */
function getWindowTarget() {
	const forklift = Application("ForkLift");

	const containerURL = $.NSURL.URLWithString(forklift.windows.first.activetabs.first().displayedurl());
	return containerURL;
}

/**
 * Gets the paths of all selected items in the frontmost window of ForkLift.
 */
function getSelectedItemsInApplication(AXApplication) {
	const focusedElement = AXGetFocusedElementOfApplication(AXApplication).deref;
	const selectedChildren = AXGetSelectedChildrenOfElement(focusedElement).deref;

	const containerURL = getWindowTarget();
	const selectedItems = (selectedChildren.js || []).map((child) => {
		const selectedItemName = AXGetValueOfElement(child).deref;
		const fullURL = containerURL.URLByAppendingPathComponent(selectedItemName);
		return fullURL.path.js;
	});

	return selectedItems;
}

function run() {
	let imagePaths = [];
	const AXForkLift = AXGetElementForApplicationWithId('com.binarynights.ForkLift').deref;
	try {
		let selection = getSelectedItemsInApplication(AXForkLift);
		if (selection.length > 0) {
			imagePaths = imagePathsForItemsInSelection(selection)
			if (imagePaths.length > 0) {
				return JSON.stringify(imagePaths);
			}
		}

		const windows = AXGetWindowsOfApplication(AXForkLift).deref;
		if (windows.count > 0) {
			for (let i = 0; i < windows.count; i++) {
				AXActivateWindowAtIndexInApplication(i, AXForkLift);
				selection = getSelectedItemsInApplication(AXForkLift);
				if (selection.length > 0) {
					imagePaths = imagePathsForItemsInSelection(selection);
					if (imagePaths.length > 0 ) {
						break;
					}
				}
			}
		}
	} catch (error) {
		if (error.errorNumber === -1743) {
			requestAutomationPermissionForApplication_('ForkLift');
		} else {
			console.log('Error:', error.message, 'errorNumber:', error.errorNumber, 'line:', error.line, 'column:', error.column);
		}
	}
	return JSON.stringify(imagePaths);
}
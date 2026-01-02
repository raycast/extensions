//@osa-lang:JavaScript
/**
* @file Script to get a list of POSIX paths to selected images in ForkLift.
* @author Stephen Kaplan <stephen@mac-nerd.org>
*/

ObjC.import("Foundation");
ObjC.import("ApplicationServices");
ObjC.import("CoreFoundation");

//#region Accessibility Interface

/**
* A wrapper around AXUIElementRef providing a simplified interface to the Mac's Accessibility API.
*
* The methods of UIElement have similar functionality to the 'System Events' scripting interface,
* but with additional flexibility, improved error-checking, and more JXA-specific considerations.
*
* @see {@link https://developer.apple.com/documentation/applicationservices/axuielement_h}
* for details on Apple's Accessibility framework.
*
*/
class UIElement {
	/**
	* Create a UIElement from an existing ObjC object.
	* @param {Ref|Object} elementRef The ObjC object, or a Ref pointing to an ObjC object.
	*/
	constructor(elementRef) {
		this.ref = elementRef;
		if (!(elementRef instanceof Ref)) {
			this.ref = ObjC.castObjectToRef(elementRef);
		}
		this.raw = this.deref();
	}

	/**
	* Get the underlying ObjC object(s) represented by this UIElement.
	*
	* If the ObjC object is an array, this method returns an array of UIElement instances.
	* For other ObjC objects with bridge support, this method returns their JS representation.
	*
	* @returns {(NSObject|UIElement[])?} The dereferenced object or array, or null if the underlying object is not JS-representable.
	*/
	deref() {
		try {
			const obj = ObjC.castRefToObject(this.ref[0]);
			if (obj.className.js === "__NSArrayM") {
				const numChildren = $.CFArrayGetCount(obj);
				const elements = [];
				for (let i = 0; i < numChildren; i++) {
					const elementRef = $.CFArrayGetValueAtIndex(obj, i);
					elements.push(new UIElement(elementRef));
				}
				return elements;
			}
			return obj;
		} catch (error1) {
			try {
				return ObjC.castRefToObject(this.ref);
			} catch (error2) {
				throw new Error(
					`Failed to obtain dereferenced object.\n\nReason 1: ${error2.message}\n\nReason 2: ${error1.message}`,
					{ cause: error2.cause },
				);
			}
		}
		return null;
	}

	attributeNames() {
		const attributeNamesRef = Ref();
		$.AXUIElementCopyAttributeNames(this.deref(), attributeNamesRef);
		return ObjC.deepUnwrap(ObjC.castRefToObject(attributeNamesRef[0]));
	}

	/**
	* Get the value reference for an attribute.
	* @param {string} name The name of the attribute, optionally prefixed with "AX".
	* @returns {UIElement?} A UIElement object, or null if no underlying value value exists.
	*/
	attribute(name) {
		const attributeRef = Ref();
		const nameString = $.CFStringCreateWithCString(null, name, $.kCFStringEncodingMacRoman);
		$.AXUIElementCopyAttributeValue(this.deref(), nameString, attributeRef);
		const obj = ObjC.castRefToObject(attributeRef[0]);
		if (obj.js == undefined) {
			return null;
		}
		return new UIElement(attributeRef);
	}

	children() {
		return this.attribute("AXChildren");
	}

	focusedElement() {
		return this.attribute("AXFocusedUIElement");
	}

	selectedChildren() {
		return this.attribute("AXSelectedChildren");
	}

	selectedRows() {
		return this.attribute("AXSelectedRows");
	}

	titleElement() {
		return this.attribute("AXTitleUIElement");
	}

	title() {
		if (this.attributeNames().includes("AXTitle")) {
			return this.attribute("AXTitle").raw.js;
		}

		const titleElement = this.titleElement();
		return titleElement.attribute("AXValue").raw.js;
	}

	value() {
		const valueRef = Ref();
		const AXValue = $.CFStringCreateWithCString(null, "AXValue", $.kCFStringEncodingMacRoman);
		$.AXUIElementCopyAttributeValue(this.deref(), AXValue, valueRef);
		return new UIElement(valueRef);
	}

	values() {
		if (Array.isArray(this.raw)) {
			return this.raw.map((element) => element.value());
		}
	}
}

/**
* Gets the top-level accessibility element of the application with the specified bundle ID.
*/
function AXGetElementForApplicationWithId(bundleId) {
	const se = Application("System Events");
	let matchingProcesses = se.applicationProcesses.whose({ bundleIdentifier: { "=": bundleId } });
	if (matchingProcesses.length == 0) {
		Application(bundleId).activate();
		let start = $.NSDate.date;
		while (matchingProcesses.count == 0 && start.timeIntervalSinceNow() > -10) {
			delay(0.1);
		}

		if (matchingProcesses.length == 0) {
			throw new Error("The process took too long to initialize.");
		}
	}

	const targetProcess = matchingProcesses.first();
	const pid = targetProcess.unixId();
	const appRef = $.AXUIElementCreateApplication(pid);
	return {
		ref: appRef,
		deref: ObjC.castRefToObject(appRef),
	};
}

//#endregion

//#region Raycast Interop

function checkVisibility(processName, windowLayer) {
	const windowList = ObjC.castRefToObject($.CGWindowListCopyWindowInfo($.kCGWindowListOptionAll, $.kCGNullWindowID));
	const window = windowList.js.find(
		(win) =>
			win.allKeys.containsObject("kCGWindowIsOnscreen") &&
		win.js["kCGWindowLayer"].js == windowLayer &&
		win.js["kCGWindowOwnerName"].js == processName,
	);
	return window != undefined;
}

function setRaycastVisibility(state) {
	const se = Application("System Events");
	const raycast = se.applicationProcesses.byName("Raycast");

	const isVisible = checkVisibility("Raycast", 8);
	if ((state && isVisible) || !(state || isVisible)) {
		return true;
	}

	Application("Raycast").activate();
	delay(0.05);

	if (state) {
		raycast.visible = true;
		return checkVisibility("Raycast", 8);
	}

	raycast.visible = false;
	delay(0.05);
	return !checkVisibility("Raycast", 8);
}

//#endregion

//#region Utilities

/**
* The function signature of the block provided to {@link attemptWithTimeout}.
* @callback attemptFn
* @param {number} attempt The current attempt number.
* @param {number} time The time since beginning the first attempt.
* @returns {boolean} True if the attempt is successful, false otherwise.
*/

/**
* Executes a block until it returns true or a stop condition is met.
* @param {number} timeout The maximum time to wait, in seconds.
* @param {number} interval The time (seconds) between each attempt.
* @param {number} maxAttempts The maximum number of attempts.
* @param {attemptFn} block The function to execute once for each attempt.
* @returns
*/
function attemptWithTimeout(timeout = -1, interval = 0.2, maxAttempts = -1, block = undefined) {
	let attempt = 0;
	let start = $.NSDate.date;
	while ((maxAttempts > -1 && attempt < maxAttempts) || (timeout > -1 && start.timeIntervalSinceNow > -timeout)) {
		attempt++;
		const timeDiff = Math.round(start.timeIntervalSinceNow * -100) / 100;
		const result = block?.(attempt, timeDiff);
		if (result) {
			return true;
		}
		delay(interval);
	}
	return false;
}

//#endregion

// MARK: Main

function getSelectedItemsInApplication(bundleId, data = undefined) {
	const AXApplication = data?.AXApplication ?? new UIElement(AXGetElementForApplicationWithId(bundleId).ref);
	const se = data?.se ?? Application("System Events");
	const scriptingTarget = data?.scriptingTarget ?? Application(bundleId);
	let initialView = data?.initialView ?? -1;
	const containerURL =
	data?.containerURL ?? $.NSURL.URLWithString(scriptingTarget.windows.first.activetabs.first().displayedurl());

	let focusedElement = AXApplication.focusedElement();
	const attributeNames = focusedElement.attributeNames();
	let selectedItems = [];

	if (attributeNames?.includes("AXSelectedChildren")) {
		let selectedChildren = focusedElement.selectedChildren();
		if (selectedChildren === null) {
			const currentApplication = data?.currentApplication ?? Application.currentApplication();
			const switchedFocus = attemptWithTimeout(10, 0.1, -1, () => {
				if (setRaycastVisibility(false)) {
					scriptingTarget.activate();
					return true;
				}
				scriptingTarget.activate();
				return false;
			});

			if (!switchedFocus) {
				throw new Error("Timed out after 10 seconds");
			}

			se.keystroke("3", { using: "command down" });
			delay(0.1);
			return getSelectedItemsInApplication(bundleId, {
				initialView: 1,
				currentApplication,
				se,
				scriptingTarget,
				containerURL,
				AXApplication,
			});
		} else {
			selectedItems =
			selectedChildren.raw.map?.((child) => {
				const selectedItemName = child.value().raw.js;
				const fullURL = containerURL.URLByAppendingPathComponent(selectedItemName);
				return fullURL.path.js;
			}) || [];
		}
	} else if (attributeNames?.includes("AXSelectedRows")) {
		const selectedRows = focusedElement.selectedRows();
		selectedItems =
		selectedRows.raw.map?.((child) => {
			const columnValues = child.children().raw;
			const column = columnValues[0];
			const selectedItemName = column.title();
			const fullURL = containerURL.URLByAppendingPathComponent(selectedItemName);
			return fullURL.path.js;
		}) || [];
	}

	if (initialView != -1) {
		let currentApplication = data?.currentApplication || Application(bundleId);
		delay(0.1);
		se.keystroke("1", { using: "command down" });
		delay(0.1);
		if (currentApplication.name() !== "Raycast") {
			currentApplication.activate();
		}
	}

	setRaycastVisibility(true);
	return selectedItems;
}

/**
* File extensions to limit output to. Files without one of these extensions will be filtered out.
*/
var supportedTypes = {
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

function imagePathsForItemsInSelection(selection) {
	const imagePaths = [];
	for (const filePath of selection) {
		const fileExtension = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
		if (supportedTypes[fileExtension]) {
			imagePaths.push(filePath);
		}
	}
	return imagePaths;
}

function requestAutomationPermissionForApplication(applicationName) {
	const currentApplication = Application.currentApplication();
	currentApplication.includeStandardAdditions = true;
	const alert = currentApplication.displayAlert("Permission Needed", {
		message:
		"To use Image Modification on selected images in " +
		applicationName +
		", you must allow Raycast to control " +
		applicationName +
		" and System Events in System Settings > Privacy & Security > Automation.\n\nDue to limitations in ForkLift's scripting support, you must also allow Raycast to interface with your Mac's Accessibility subsystem by enabling it under System Settings > Privacy & Security > Accessibility.",
		buttons: ["Dismiss", "Open Privacy Settings"],
	});
	const btn = alert.buttonReturned;
	if (btn == "Open Privacy Settings") {
		currentApplication.openLocation("x-apple.systempreferences:com.apple.preference.security?Privacy");
	}
	return btn;
}

function run() {
	let imagePaths = [];
	if (!$.AXIsProcessTrusted()) {
		requestAutomationPermissionForApplication("ForkLift");
		return "[]";
	}

	try {
		const selection = getSelectedItemsInApplication("com.binarynights.ForkLift");
		imagePaths = imagePathsForItemsInSelection(selection);
	} catch (error) {
		if (error.errorNumber === -1743) {
			requestAutomationPermissionForApplication("ForkLift");
		} else {
			throw error;
		}
	}
	return JSON.stringify(imagePaths);
}

//@osa-lang:JavaScript
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
	const alert = currentApplication.displayAlert('Permission Needed', { message: 'To use Image Modification on selected images in ' + applicationName + ', you must allow Raycast to control ' + applicationName + ' in System Settings > Privacy & Security > Automation.', buttons: ['Dismiss', 'Open Privacy Settings']});
	const btn = alert.buttonReturned;
	if (btn == 'Open Privacy Settings') {
		currentApplication.openLocation('x-apple.systempreferences:com.apple.preference.security?Privacy_Automation');
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

function run() {
	let imagePaths = [];
	try {
		const qspace = Application('QSpace Pro');
		qspace.includeStandardAdditions = true;

		let selection = qspace.selectedItems.urlstr()
		if (selection.length > 0) {
			imagePaths = imagePathsForItemsInSelection(selection.map(x => x.substring(7)))
			if (imagePaths.length > 0) {
				return JSON.stringify(imagePaths);
			}
		}

		const windowIds = qspace.windows.id();
		if (windowIds.length > 0) {
			for (const windowId of windowIds) {
				const window = qspace.windows.byId(windowId);
				selection = window.selectedItems.urlstr();
				if (selection.length > 0) {
					imagePaths = imagePathsForItemsInSelection(selection.map(x => x.substring(7)))
					if (imagePaths.length > 0 ) {
						break;
					}
				}
			}
		}
	} catch (error) {
		if (error.errorNumber === -1743) {
			requestAutomationPermissionForApplication_('QSpace Pro');
		} else {
			console.log('Error:', error.message, 'errorNumber:', error.errorNumber, 'line:', error.line, 'column:', error.column);
		}
	}
	return JSON.stringify(imagePaths);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = DisableBlocking;
const api_1 = require("@raycast/api");
const storage_1 = require("./storage");
const hostsManager_1 = require("./hostsManager");
async function DisableBlocking() {
    try {
        const status = await (0, storage_1.getBlockingStatus)();
        if (!status.isActive) {
            await (0, api_1.showHUD)('ℹ️ Site blocking is already disabled');
            return;
        }
        const sudoAvailable = await (0, hostsManager_1.isSudoAvailable)();
        if (!sudoAvailable) {
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: 'System Error',
                message: 'Administrator privileges are required but sudo is not available'
            });
            return;
        }
        const confirmed = await (0, api_1.confirmAlert)({
            title: 'Disable Site Blocking',
            message: 'This will remove all SiteBlocker entries from your hosts file and restore access to blocked websites. You\'ll need to enter your password.',
            primaryAction: {
                title: 'Disable Blocking',
                style: api_1.Alert.ActionStyle.Default
            },
            dismissAction: {
                title: 'Cancel',
                style: api_1.Alert.ActionStyle.Cancel
            }
        });
        if (!confirmed) {
            return;
        }
        const loadingToast = await (0, api_1.showToast)({
            style: api_1.Toast.Style.Animated,
            title: 'Disabling Site Blocking...',
            message: 'Please enter your password when prompted'
        });
        try {
            const result = await (0, hostsManager_1.removeDomainsFromHosts)();
            if (result.success) {
                await (0, storage_1.setBlockingStatus)(false);
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: '✅ Site Blocking Disabled',
                    message: 'All websites are now accessible again'
                });
                if (result.message.includes('No blocked domains found')) {
                    await (0, api_1.showHUD)('ℹ️ No blocked domains were found in hosts file');
                }
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Failed to Disable Blocking',
                    message: result.message
                });
            }
        }
        catch (error) {
            loadingToast.hide();
            if (error.message.includes('Authentication was canceled')) {
                await (0, api_1.showHUD)('⚠️ Authentication canceled - blocking remains enabled');
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Error Disabling Blocking',
                    message: error.message || 'An unexpected error occurred'
                });
            }
            console.error('Error disabling blocking:', error);
        }
    }
    catch (error) {
        console.error('Error in DisableBlocking command:', error);
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Failure,
            title: 'Unexpected Error',
            message: 'Failed to disable site blocking'
        });
    }
}
//# sourceMappingURL=disable-blocking.js.map
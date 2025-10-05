"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = EnableBlocking;
const api_1 = require("@raycast/api");
const storage_1 = require("./lib/storage");
const hostsManager_1 = require("./lib/hostsManager");
async function EnableBlocking() {
    try {
        const domainsToBlock = await (0, storage_1.getBlockedDomainList)();
        if (domainsToBlock.length === 0) {
            await (0, api_1.showHUD)('❌ No websites in your block list. Add some websites first!');
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
            title: 'Enable Site Blocking',
            message: `This will block ${domainsToBlock.length} website(s) by modifying your system's hosts file. You'll need to enter your password.`,
            primaryAction: {
                title: 'Enable Blocking',
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
            title: 'Enabling Site Blocking...',
            message: 'Please enter your password when prompted'
        });
        try {
            const result = await (0, hostsManager_1.addDomainsToHosts)(domainsToBlock);
            if (result.success) {
                await (0, storage_1.setBlockingStatus)(true);
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Success,
                    title: '🚫 Site Blocking Enabled',
                    message: `Successfully blocked ${domainsToBlock.length} website(s)`
                });
                if (result.backupCreated) {
                    await (0, api_1.showHUD)('✅ Backup created at /etc/hosts.siteblocker.bak');
                }
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Failed to Enable Blocking',
                    message: result.message
                });
            }
        }
        catch (error) {
            loadingToast.hide();
            if (error.message.includes('Authentication was canceled')) {
                await (0, api_1.showHUD)('⚠️ Authentication canceled - blocking not enabled');
            }
            else {
                await (0, api_1.showToast)({
                    style: api_1.Toast.Style.Failure,
                    title: 'Error Enabling Blocking',
                    message: error.message || 'An unexpected error occurred'
                });
            }
            console.error('Error enabling blocking:', error);
        }
    }
    catch (error) {
        console.error('Error in EnableBlocking command:', error);
        await (0, api_1.showToast)({
            style: api_1.Toast.Style.Failure,
            title: 'Unexpected Error',
            message: 'Failed to enable site blocking'
        });
    }
}
//# sourceMappingURL=enable-blocking.js.map
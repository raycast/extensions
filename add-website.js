"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddWebsite;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const api_1 = require("@raycast/api");
const domainUtils_1 = require("./lib/domainUtils");
const storage_1 = require("./lib/storage");
function AddWebsite() {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { pop } = (0, api_1.useNavigation)();
    async function handleSubmit(values) {
        setIsLoading(true);
        try {
            const { domain, isValid, error } = (0, domainUtils_1.processDomainInput)(values.domain);
            if (!isValid) {
                await (0, api_1.showHUD)(`❌ ${error}`);
                setIsLoading(false);
                return;
            }
            const existingDomains = await (0, storage_1.getBlockedDomainList)();
            if ((0, domainUtils_1.isDuplicateDomain)(domain, existingDomains)) {
                await (0, api_1.showHUD)(`❌ ${domain} is already in your block list`);
                setIsLoading(false);
                return;
            }
            await (0, storage_1.addBlockedDomain)(domain, values.notes.trim() || undefined);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: 'Website Added',
                message: `${domain} added to your block list`
            });
            pop();
        }
        catch (error) {
            console.error('Error adding website:', error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: 'Failed to Add Website',
                message: error.message || 'An unexpected error occurred'
            });
        }
        finally {
            setIsLoading(false);
        }
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Add Website", onSubmit: handleSubmit, icon: "\u2795" }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "domain", title: "Website", placeholder: "Enter website to block (e.g., youtube.com, facebook.com)", info: "Enter the domain name you want to block. Protocols (http/https) and paths will be automatically removed.", storeValue: false }), (0, jsx_runtime_1.jsx)(api_1.Form.TextArea, { id: "notes", title: "Notes (Optional)", placeholder: "Why are you blocking this site? (e.g., distraction during work hours)", info: "Add optional notes to remind you why you're blocking this website.", storeValue: false }), (0, jsx_runtime_1.jsx)(api_1.Form.Separator, {}), (0, jsx_runtime_1.jsx)(api_1.Form.Description, { title: "Info", text: "\u2022 This adds the website to your personal block list\n\u2022 Use 'Enable Site Blocking' to activate blocking\n\u2022 Blocked sites will redirect to localhost (127.0.0.1)\n\u2022 You can view and manage your list anytime" })] }));
}
//# sourceMappingURL=add-website.js.map
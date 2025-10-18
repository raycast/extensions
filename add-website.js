"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AddWebsite;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const api_1 = require("@raycast/api");
const domainUtils_1 = require("./domainUtils");
const storage_1 = require("./storage");
const hudHelper_1 = require("./hudHelper");
function AddWebsite() {
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const { pop } = (0, api_1.useNavigation)();
    react_1.default.useEffect(() => {
        (0, storage_1.getCategories)().then(setCategories);
    }, []);
    async function handleSubmit(values) {
        setIsLoading(true);
        try {
            const { domain, isValid, error } = (0, domainUtils_1.processDomainInput)(values.domain);
            if (!isValid) {
                await (0, hudHelper_1.showLongHUD)(`❌ ${error}`);
                setIsLoading(false);
                return;
            }
            const existingDomains = await (0, storage_1.getBlockedDomainList)();
            if ((0, domainUtils_1.isDuplicateDomain)(domain, existingDomains)) {
                await (0, hudHelper_1.showLongHUD)(`❌ ${domain} is already in your block list`);
                setIsLoading(false);
                return;
            }
            await (0, storage_1.addBlockedDomain)(domain, undefined, true, values.categories);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Success,
                title: "Website Added",
                message: `${domain} added to your block list`,
            });
            pop();
        }
        catch (error) {
            console.error("Error adding website:", error);
            await (0, api_1.showToast)({
                style: api_1.Toast.Style.Failure,
                title: "Failed to Add Website",
                message: error.message || "An unexpected error occurred",
            });
        }
        finally {
            setIsLoading(false);
        }
    }
    return ((0, jsx_runtime_1.jsxs)(api_1.Form, { isLoading: isLoading, actions: (0, jsx_runtime_1.jsx)(api_1.ActionPanel, { children: (0, jsx_runtime_1.jsx)(api_1.Action.SubmitForm, { title: "Add Website", onSubmit: handleSubmit, icon: "\u2795" }) }), children: [(0, jsx_runtime_1.jsx)(api_1.Form.TextField, { id: "domain", title: "Website URL", placeholder: "youtube.com, facebook.com, twitter.com", storeValue: false }), (0, jsx_runtime_1.jsx)(api_1.Form.TagPicker, { id: "categories", title: "Categories", placeholder: "Select categories (optional)", storeValue: false, children: categories.map((cat) => ((0, jsx_runtime_1.jsx)(api_1.Form.TagPicker.Item, { value: cat.name, title: cat.name }, cat.name))) })] }));
}
//# sourceMappingURL=add-website.js.map
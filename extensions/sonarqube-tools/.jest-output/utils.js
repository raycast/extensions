"use strict";
/// <reference types="node" />
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = exports.SONARQUBE_PROJECTS_STORAGE_KEY = exports.execAsync = void 0;
exports.runCommand = runCommand;
exports.runInNewTerminal = runInNewTerminal;
exports.isSonarQubeRunning = isSonarQubeRunning;
exports.loadProjects = loadProjects;
exports.saveProjects = saveProjects;
var api_1 = require("@raycast/api");
var child_process_1 = require("child_process");
var util_1 = require("util");
var http = require("http");
exports.execAsync = (0, util_1.promisify)(child_process_1.exec);
var PODMAN_PATH_BIN = "/opt/podman/bin";
var HOMEBREW_PATH_BIN = "/opt/homebrew/bin";
// Common error patterns and their user-friendly messages
var ERROR_PATTERNS = [
    { pattern: /command not found/i, message: "Command not found. Make sure all required tools are installed." },
    { pattern: /permission denied/i, message: "Permission denied. You may need to run with higher privileges." },
    { pattern: /no such file or directory/i, message: "File or directory not found. Check that paths are correct." },
    { pattern: /connection refused/i, message: "Connection refused. Make sure the service is running." },
    { pattern: /(timeout|timed out)/i, message: "Operation timed out. The service might be unresponsive." },
    { pattern: /cannot access/i, message: "Unable to access resource. Check permissions or network connection." },
    { pattern: /gradle/i, message: "Gradle issue detected. Check your project's build configuration." },
    { pattern: /sonarqube/i, message: "SonarQube error detected. Verify SonarQube server status and configuration." },
    { pattern: /podman/i, message: "Podman error detected. Verify Podman installation and configuration." },
];
/**
 * Get user-friendly error message based on error output
 */
function getUserFriendlyErrorMessage(errorMsg) {
    // Check if error matches any known patterns
    for (var _i = 0, ERROR_PATTERNS_1 = ERROR_PATTERNS; _i < ERROR_PATTERNS_1.length; _i++) {
        var _a = ERROR_PATTERNS_1[_i], pattern = _a.pattern, message = _a.message;
        if (pattern.test(errorMsg)) {
            return "".concat(message, "\n\nDetails: ").concat(errorMsg.substring(0, 100)).concat(errorMsg.length > 100 ? '...' : '');
        }
    }
    // Default case - return truncated error
    return errorMsg.substring(0, 150) + (errorMsg.length > 150 ? '...' : '');
}
function runCommand(command, successMessage, failureMessage, options) {
    return __awaiter(this, void 0, void 0, function () {
        var commandName, toast, currentProccessEnv, baseEnv, currentPath, newPath, executionEnv, _a, stdout, stderr, friendlyErrorMsg, truncatedOutput, error_1, errorMessage, friendlyErrorMsg;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    commandName = command.split(" ")[0];
                    return [4 /*yield*/, (0, api_1.showToast)({
                            style: api_1.Toast.Style.Animated,
                            title: "Running: ".concat(commandName, "..."),
                            message: "Preparing environment...",
                        })];
                case 1:
                    toast = _b.sent();
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    // Update toast to show we're executing
                    toast.message = "Executing command...";
                    currentProccessEnv = typeof process !== "undefined" ? process.env : {};
                    baseEnv = __assign(__assign({}, currentProccessEnv), options === null || options === void 0 ? void 0 : options.env);
                    currentPath = baseEnv.PATH || "";
                    newPath = "".concat(PODMAN_PATH_BIN, ":").concat(HOMEBREW_PATH_BIN, ":").concat(currentPath);
                    executionEnv = __assign(__assign({}, baseEnv), { PATH: newPath });
                    return [4 /*yield*/, (0, exports.execAsync)(command, __assign(__assign({}, options), { env: executionEnv }))];
                case 3:
                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                    if (stderr && !stderr.toLowerCase().includes("warning")) {
                        toast.style = api_1.Toast.Style.Failure;
                        toast.title = failureMessage;
                        friendlyErrorMsg = getUserFriendlyErrorMessage(stderr);
                        toast.message = "Command '".concat(commandName, "' failed: ").concat(friendlyErrorMsg);
                        // Still log the full error for debugging
                        console.error("Error executing: ".concat(command));
                        console.error(stderr);
                    }
                    else {
                        toast.style = api_1.Toast.Style.Success;
                        toast.title = successMessage;
                        // Format output for better readability
                        if (stdout) {
                            truncatedOutput = stdout.length > 200 ? stdout.substring(0, 200) + '...' : stdout;
                            toast.message = truncatedOutput;
                            console.log("Successfully executed: ".concat(command));
                            console.log(stdout);
                        }
                        else {
                            toast.message = "Command completed successfully with no output.";
                            console.log("Successfully executed: ".concat(command, " (no output)"));
                        }
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _b.sent();
                    toast.style = api_1.Toast.Style.Failure;
                    toast.title = failureMessage;
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    friendlyErrorMsg = getUserFriendlyErrorMessage(errorMessage);
                    // Provide actionable error message
                    toast.message = "Failed to execute '".concat(commandName, "': ").concat(friendlyErrorMsg);
                    // Log full error for debugging
                    console.error("Failed to execute: ".concat(command));
                    console.error(errorMessage);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
function runInNewTerminal(commands, successMessage, failureMessage, options) {
    return __awaiter(this, void 0, void 0, function () {
        var operationName, trackProgress, progressCommands, progressMarkers, i, cmd, _i, progressMarkers_1, _a, pattern, message, escapedCommands, appleScriptCommand, toast, error_2, errorMessage, friendlyErrorMsg;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    operationName = ((_c = (_b = commands[0]) === null || _b === void 0 ? void 0 : _b.split(/\s+/)[0]) === null || _c === void 0 ? void 0 : _c.replace(/^cd$/, 'Terminal')) || 'Operation';
                    trackProgress = (options === null || options === void 0 ? void 0 : options.trackProgress) !== false;
                    progressCommands = __spreadArray([], commands, true);
                    if (trackProgress) {
                        progressMarkers = [
                            { pattern: /podman|docker/, message: "Starting containerization software" },
                            { pattern: /sonarqube/, message: "Preparing SonarQube environment" },
                            { pattern: /gradlew|gradle/, message: "Running Gradle build and tests" },
                            { pattern: /test/, message: "Running tests" },
                            { pattern: /jacoco/, message: "Generating code coverage report" },
                            { pattern: /detekt/, message: "Running code quality analysis" },
                            { pattern: /sonar/, message: "Sending data to SonarQube" },
                            { pattern: /open/, message: "Opening results" },
                        ];
                        // Insert progress echo statements before relevant commands
                        for (i = 0; i < progressCommands.length; i++) {
                            cmd = progressCommands[i];
                            for (_i = 0, progressMarkers_1 = progressMarkers; _i < progressMarkers_1.length; _i++) {
                                _a = progressMarkers_1[_i], pattern = _a.pattern, message = _a.message;
                                if (pattern.test(cmd) && !cmd.startsWith('echo')) {
                                    // Insert progress message before this command
                                    progressCommands.splice(i, 0, "echo \"\n\u25B6 Progress: ".concat(message, "...\""));
                                    i++; // Skip ahead since we just added an element
                                    break;
                                }
                            }
                        }
                        // Add timestamp tracking to key commands
                        progressCommands = progressCommands.map(function (cmd) {
                            if (cmd.includes('gradle') || cmd.includes('podman') || cmd.includes('sonar')) {
                                // Add time tracking for long-running commands
                                return "echo \"$(date +\"%H:%M:%S\") \u25B6 Starting: ".concat(cmd.replace(/"/g, '\\"'), "\" && ").concat(cmd, " && echo \"$(date +\"%H:%M:%S\") \u2713 Completed\"");
                            }
                            return cmd;
                        });
                    }
                    // Add error handling wrapper
                    progressCommands.unshift('set -e'); // Make script exit on first error
                    progressCommands.push('echo "✅ All operations completed successfully!"');
                    escapedCommands = progressCommands.map(function (cmd) { return cmd.replace(/"/g, '\\"'); });
                    appleScriptCommand = "\n    tell application \"Terminal\"\n      activate\n      set newTab to do script \"".concat(escapedCommands.join(" && "), "\"\n      delay 1\n      set custom title of tab 1 of window 1 to \"SonarQube Analysis\"\n    end tell\n  ");
                    return [4 /*yield*/, (0, api_1.showToast)({
                            style: api_1.Toast.Style.Animated,
                            title: "Launching Terminal",
                            message: "Preparing to run ".concat(operationName, " in new window..."),
                        })];
                case 1:
                    toast = _d.sent();
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, (0, exports.execAsync)("osascript -e '".concat(appleScriptCommand.replace(/'/g, "'\\''"), "'"))];
                case 3:
                    _d.sent();
                    toast.style = api_1.Toast.Style.Success;
                    toast.title = successMessage;
                    toast.message = trackProgress ?
                        "Commands running in Terminal with progress tracking." :
                        "Commands sent to new Terminal window.";
                    // Update toast with hint about the terminal window
                    setTimeout(function () {
                        toast.title = "Running in Terminal";
                        toast.message = "Check the Terminal window for real-time progress.";
                    }, 3000);
                    return [3 /*break*/, 5];
                case 4:
                    error_2 = _d.sent();
                    toast.style = api_1.Toast.Style.Failure;
                    toast.title = failureMessage;
                    errorMessage = error_2 instanceof Error ? error_2.message : String(error_2);
                    friendlyErrorMsg = getUserFriendlyErrorMessage(errorMessage);
                    toast.message = "Could not open Terminal: ".concat(friendlyErrorMsg);
                    // Log full error for debugging
                    console.error("Failed to execute AppleScript for new Terminal:");
                    console.error(errorMessage);
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Check if SonarQube server is running by making an HTTP request to its status endpoint.
 *
 * This enhanced version provides sophisticated status detection with the following features:
 * - Intelligent state detection (running, starting, initializing, stopped)
 * - Automatic retry mechanism with exponential backoff
 * - Configurable timeouts for different network conditions
 * - Detailed status reporting for better user feedback
 * - Smart error handling with user-friendly messages
 *
 * @param options Configuration options for the status check
 * @param options.retries Number of retry attempts if initial check fails (default: 2)
 * @param options.timeout Custom timeout in milliseconds (default: 3000)
 * @param options.detailed When true, returns detailed status object instead of boolean
 * @returns Promise resolving to either a boolean (backward compatibility) or a detailed status object
 *          with running (boolean), status (string), and details (string) properties
 */
function isSonarQubeRunning(options) {
    return __awaiter(this, void 0, void 0, function () {
        var maxRetries, timeoutMs, detailed, lastError, attemptCount, _loop_1, state_1;
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    maxRetries = (_a = options === null || options === void 0 ? void 0 : options.retries) !== null && _a !== void 0 ? _a : 2;
                    timeoutMs = (_b = options === null || options === void 0 ? void 0 : options.timeout) !== null && _b !== void 0 ? _b : 3000;
                    detailed = (_c = options === null || options === void 0 ? void 0 : options.detailed) !== null && _c !== void 0 ? _c : false;
                    lastError = "";
                    attemptCount = 0;
                    _loop_1 = function () {
                        var result, error_3, delay_1;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    attemptCount++;
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 3, , 5]);
                                    return [4 /*yield*/, checkSonarQubeStatus(timeoutMs)];
                                case 2:
                                    result = _e.sent();
                                    if (detailed) {
                                        if (result.status === "up") {
                                            return [2 /*return*/, { value: { running: true, status: "running", details: "SonarQube is running normally" } }];
                                        }
                                        else if (result.status === "starting") {
                                            return [2 /*return*/, { value: { running: false, status: "starting", details: "SonarQube is still starting up" } }];
                                        }
                                        else {
                                            return [2 /*return*/, { value: { running: false, status: "error", details: "SonarQube returned status: ".concat(result.status) } }];
                                        }
                                    }
                                    return [2 /*return*/, { value: result.status === "up" }];
                                case 3:
                                    error_3 = _e.sent();
                                    lastError = error_3 instanceof Error ? error_3.message : String(error_3);
                                    // If we've reached max retries, give up
                                    if (attemptCount > maxRetries) {
                                        return [2 /*return*/, "break"];
                                    }
                                    delay_1 = Math.min(500 * Math.pow(2, attemptCount - 1), 5000);
                                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, delay_1); })];
                                case 4:
                                    _e.sent();
                                    return [3 /*break*/, 5];
                                case 5: return [2 /*return*/];
                            }
                        });
                    };
                    _d.label = 1;
                case 1:
                    if (!(attemptCount <= maxRetries)) return [3 /*break*/, 3];
                    return [5 /*yield**/, _loop_1()];
                case 2:
                    state_1 = _d.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    if (state_1 === "break")
                        return [3 /*break*/, 3];
                    return [3 /*break*/, 1];
                case 3:
                    // If we get here, all attempts failed
                    if (detailed) {
                        // Differentiate between connection refused (server down) and timeout (server might be starting)
                        if (lastError.includes("ECONNREFUSED")) {
                            return [2 /*return*/, { running: false, status: "down", details: "SonarQube server is not running" }];
                        }
                        else if (lastError.includes("timeout")) {
                            return [2 /*return*/, { running: false, status: "timeout", details: "SonarQube server is not responding (may be starting)" }];
                        }
                        else {
                            return [2 /*return*/, { running: false, status: "error", details: "Error checking SonarQube: ".concat(lastError) }];
                        }
                    }
                    return [2 /*return*/, false];
            }
        });
    });
}
;
/**
 * Helper function to check SonarQube status with a specific timeout
 * @private
 */
function checkSonarQubeStatus(timeoutMs) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve, reject) {
                    var options = {
                        hostname: "localhost",
                        port: 9000,
                        path: "/api/system/status",
                        method: "GET",
                        timeout: timeoutMs,
                    };
                    var req = http.get(options, function (res) {
                        var data = "";
                        res.on("data", function (chunk) {
                            data += chunk;
                        });
                        res.on("end", function () {
                            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
                                try {
                                    // Try to parse response as JSON to get actual status
                                    var statusInfo = JSON.parse(data);
                                    resolve(statusInfo);
                                }
                                catch (e) {
                                    // If we can't parse it but got a 2xx status, assume it's running
                                    resolve({ status: "up" });
                                }
                            }
                            else if (res.statusCode === 503) {
                                // Service unavailable often means the server is starting
                                resolve({ status: "starting" });
                            }
                            else {
                                reject(new Error("Unexpected status code: ".concat(res.statusCode)));
                            }
                        });
                    });
                    req.on("error", function (err) {
                        reject(err);
                    });
                    req.on("timeout", function () {
                        req.destroy();
                        reject(new Error("Request timed out"));
                    });
                })];
        });
    });
}
exports.SONARQUBE_PROJECTS_STORAGE_KEY = "sonarqubeProjectsList";
var generateId = function () { return Math.random().toString(36).substring(2, 11); };
exports.generateId = generateId;
function loadProjects() {
    return __awaiter(this, void 0, void 0, function () {
        var storedProjects;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api_1.LocalStorage.getItem(exports.SONARQUBE_PROJECTS_STORAGE_KEY)];
                case 1:
                    storedProjects = _a.sent();
                    if (storedProjects) {
                        try {
                            return [2 /*return*/, JSON.parse(storedProjects)];
                        }
                        catch (e) {
                            console.error("Failed to parse stored projects:", e);
                            return [2 /*return*/, []];
                        }
                    }
                    return [2 /*return*/, []];
            }
        });
    });
}
function saveProjects(projects) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, api_1.LocalStorage.setItem(exports.SONARQUBE_PROJECTS_STORAGE_KEY, JSON.stringify(projects))];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}

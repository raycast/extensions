export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export default `
tell application "System Events"
	set appInfo to {}
	set appProcesses to every process whose background only is false

	repeat with anApp in appProcesses
		set appName to name of anApp
		set appPID to unix id of anApp
		
		try
			set appPath to POSIX path of (application file of anApp as alias)

		on error errMsg
			set appPath to ""
		end try
		
		set end of appInfo to {appName, appPID, appPath}
	end repeat
end tell
return appInfo

`;

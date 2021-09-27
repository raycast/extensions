# Debug an extension

You can log output to a OS log stream and view the stream either when starting `ray develop` or via the OS console app, if you prefer a separate window. You can use standard `console.log` or `console.error` calls for logging information and errors. Unhandled exceptions and unhandled promise rejections are automatically logged and shown in the user interface. If you wish to show your own errors in the UI, you can use the [showToast](file:///Users/mann/Developer/api-alpha/documentation/modules.html#showToast) method.

**Debugging via ray develop**: Just run `ray develop` and view the log stream in the output.

**Debugging via OS console**: Open `/Applications/Utilities/Console.app` and in the top right corner, select `Subsystem` and enter `com.raycast.extensions`. In the **Action** menu, check **Include Info Messages** and **Include Debug Messages**. Click the **Start** button \(Big Sur\) to see the output of log calls from your command.


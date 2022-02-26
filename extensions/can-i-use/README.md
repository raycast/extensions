# Can I Use

This extension provides up-to-date browser support for front-end web technologies on desktop and mobile web browsers.

![Screenshot of the main view](./assets/demo.png)

## Browserlist configuration

It's possible to configure this extension so that it reads the [Browserlist](https://github.com/browserslist/browserslist) configuration on web projects and show you the technologies supported (or not) directly from the main view. To do so, add the path to your project in the preferences in "Project path" (e.g `~/my-project`)

If you're using different environments in Browserlist, you can also specify it in the preferences in "Environment". Let's take the following configuration for example:

```
[production]
> 1%
ie 10

[modern]
last 1 chrome version
last 1 firefox version

[ssr]
node 12
```

If you want to configure your extension to show the modern environment, specify explicitly `modern` in the "Environment" text field. By default, `production` is used.

# Make.com

Run Make.com Scenarios on demand.

This Extension lists the active Make.com Scenarios and allows you to trigger them directly from [Raycast](https://raycast.com).

> [!NOTE]  
> Due to Make.com API's limitations, you can trigger only the _Active_ scenarios.

## Configuration

To configure this Extension properly you need to obtain some values from Make.com first.

### Make.com API key

To create the API key, you need to visit [this page](https://make.com/user/api).

### Environment ID

The **Environment ID** is basically the root address of your Make.com environment, eg.:

<pre><strong>https://eu1.make.com</strong>/organization/123456/dashboard</pre>

> [!IMPORTANT]
>
> Don't add the trailing slash.

### Organization ID

Login to Make.com and visit the _Organization_ dashboard (available in Make's sidebar). The **Organization ID** is in the URL of this page, eg:

 <pre>https://eu1.make.com/organization/<strong>123456</strong>/dashboard</pre>

> [!NOTE]
>
> As of now **only one organization** is supported.

### (optional) Skip Webhooks and Mailhooks

Default: `true`

Usually the Scenarios using the Webhook/Mailhook triggers expect some payload to run correctly. As of now we don't support custom payloads for these triggers. Due to that they are not listed within this Extension.

If you wish to list them anyway, you can opt-out from this behavior by setting this option to `false`.

# Ntfy - Raycast extension

Send notifications to your devices using ntfy.sh
For more information visit their [documentation][ntfy-doc]

> [!IMPORTANT]
> Topics on ntfy.sh are public by default.

## Configuration

Set a topic that is difficult to guess to avoid your notifications being delivered to others.

I suggest generating a random id with [nanoid][nanoid-gen]
> Example: ygJYwllDVqbY_I-iI0YVG

Then install the [ntfy app][ntfy-app] and subscribe to the topic on your phone.

## Privacy and self-hosting

Ntfy.sh is a public service, but you can also [host your own server][ntfy-self-host].
For a fast way to setup the server I suggest trying their [Docker image][ntfy-docker].

## Roadmap

This tool is meant to give quick basic access to sending notifications through [ntfy.sh][ntfy] for now, but I'm working
on additional features that may fit the usage of whoever wants this like:

- [ ] Sending attachment files through the notification
- [ ] Better customization of the notification via UI
- [ ] Configure multiple servers/topics
- [ ] Read/receive notifications on Raycast
- [ ] Contribute to [ntfy.sh][ntfy]:
  - [ ] Add support for [android intent/activity][android-intent], so we can trigger share activities and possibly more

If you have more suggestions feel free to let me know on a new [Issue][gh-feat-req].

## Bugs

Found a bug? Let me know on a new [Issue][gh-bug].

## About Wés

I'm a web developer who loves the web and the javascript ecosystem, find me anywhere as [@wesleycoder][wes-twitter] or
at [guima.dev][guima-coffee]

> I am not the owner or maintainer of [ntfy.sh][ntfy].
> I am very enthusiastic about this tool/service and I am always willing to help.

## Support me

Liked this and want to support me?
Feel free to leave me a tip on [Ko-Fi](https://ko-fi.com/wesleycoder/tip).

[guima-coffee]: https://guima.dev/coffee
[wes-twitter]: https://x.com/wesleycoder
[ntfy]: https://ntfy.sh/
[ntfy-doc]: https://docs.ntfy.sh/
[ntfy-app]: https://docs.ntfy.sh/#step-1-get-the-app
[nanoid-gen]: https://nanoid.jormaechea.com.ar/
[ntfy-docker]: https://docs.ntfy.sh/install/#docker
[ntfy-self-host]: https://docs.ntfy.sh/install/
[android-intent]: https://developer.android.com/guide/components/intents-filters
[gh-feat-req]: https://github.com/raycast/extensions/issues/new?title=%5BNtfy%5D+...&template=extension_feature_request.yml&labels=extension%2Cfeature%2Brequest&extension-url=https%3A%2F%2Fwww.raycast.com%2Fwesleycoder%2Fntfy&body=%0A%3C%21--%0APlease+update+the+title+above+to+consisely+describe+the+issue%0A--%3E%0A%0A%23%23%23+Extension%0A%0A%23%7Brepository_url%28extension.latest_version%29%7D%0A%0A%23%23%23+Description%0A%0A%3C%21--%0ADescribe+the+feature+and+the+current+behavior%2Fstate.%0A--%3E%0A%0A%23%23%23+Who+will+benefit+from+this+feature%3F%0A%0A%23%23%23+Anything+else%3F%0A%0A%3C%21--%0ALinks%3F+References%3F+Anything+that+will+give+us+more+context%21%0ATip%3A+You+can+attach+images+or+log+files+by+clicking+this+area+to+highlight+it+and+then+dragging+files+in.%0A--%3E%0A%0A
[gh-bug]: https://github.com/raycast/extensions/issues/new?title=%5BNtfy%5D+...&template=extension_bug_report.yml&labels=extension%2Cbug&extension-url=https%3A%2F%2Fwww.raycast.com%2Fwesleycoder%2Fntfy&body=%0A%3C%21--%0APlease+update+the+title+above+to+consisely+describe+the+issue%0A--%3E%0A%0A%23%23%23+Extension%0A%0Ahttps%3A%2F%2Fraycast.com%2F%23%7Bextension_path%28extension%29%7D%0A%0A%23%23%23+Description%0A%0A%3C%21--%0APlease+provide+a+clear+and+concise+description+of+what+the+bug+is.+Include+screenshots+if+needed.+Please+test+using+the+latest+version+of+the+extension%2C+Raycast+and+API.%0A--%3E%0A%0A%23%23%23+Steps+To+Reproduce%0A%0A%3C%21--%0AYour+bug+will+get+fixed+much+faster+if+the+extension+author+can+easily+reproduce+it.+Issues+without+reproduction+steps+may+be+immediately+closed+as+not+actionable.%0A--%3E%0A%0A1.+In+this+environment...%0A2.+With+this+config...%0A3.+Run+%27...%27%0A4.+See+error...%0A%0A%23%23%23+Current+Behavior%0A%0A%23%23%23+Expected+Behavior%0A%0A

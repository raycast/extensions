# GIF Search

This extension searches for animated GIFs from the internet using [giphy.com](https://giphy.com) or [tenor.com](https://tenor.com). In order to use any of the GIF search API's, you'll have to sign up for a free developer account and obtain an API key. You'll be asked to supply that API key when first loading up the GIF Search extension.

You can sign up for a free developer account for Giphy at [https://developers.giphy.com](https://developers.giphy.com), or Tenor at [https://tenor.com/developer/keyregistration](https://tenor.com/developer/keyregistration).

## About this extension

![](./media/preview.gif)

Recently, I was horrified to learn that there _still_ wasn't a gif search extension available for [Raycast](http://raycast.com) (one of my all-time favorite Mac apps). After reading through the (very good!!) [Raycast extension docs](https://developers.raycast.com), I figured this would be a breeze to implement against either the [Giphy](https://developers.giphy.com) or [Tenor](https://tenor.com/gifapi) APIs.

Turns out, I was both right and wrong: it was quite easy to build a Raycast gif search extension against Giphy, but the reason one didn't already exist is that Raycast currently can't display animated gifs... 😬.

Still, I was undeterred. I figured I might be able to hack my way around this limitation by decoding the gif manually in the extension. I used the [`gif-frames`](https://www.npmjs.com/package/gif-frames) project to decode each frame of a gif into a jpeg-based byte stream. I then converted that to a buffer, which can then be turned into a base64 data-uri. Then it's just setting an `<img>` tag's `src` attribute to each frame's data-uri and setting that to a `<Detail>` view on an interval. Turns out it all works!! (sorta)

At this point, I've taken this extension as far as I think it can possibly go given Raycast's current limitations. There's a whole lot of blinking and gross UI that happens while the image data is loaded into memory and cache, and if you try to pop back out of the navigation while that's happening, the navigation stack crashes. However, I still think the extension is useful since you can search for gifs and either open them in your browser, or copy the URL to your clipboard. I've therefore decided to hide the inline GIF preview behind a settings checkbox, to be enabled by brave users that want to see how buggy it is. Maybe some day, when Raycast has native GIF rendering, we can enable it by

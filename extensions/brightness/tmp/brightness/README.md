brightness
==========

Command-line display brightness control for macOS.

This tool enables you to set and obtain the brightness level of all
internal and certain external displays from the command line or a
script.

<table><tr><th> If you cannot control your display’s brightness from
Displays System Preferences, you will not be able to do it with
<tt>brightness</tt>. See <a
href="https://github.com/nriley/brightness/issues/11">this issue</a>
for more information and some potential other options.
</th></tr></table>

Install with Homebrew
--------------------

```brew install brightness```

Install From Source
------------------

```shell
git clone https://github.com/nriley/brightness.git
cd brightness
make
sudo make install
```

macOS Version Support
---------------------

`brightness` requires OS X/macOS 10.8 or later — but go back in the
commit history and you’ll find code compatible with older (Mac) OS X
versions.

Through macOS 10.12.3, `brightness` uses documented APIs.  It works on
internal laptop displays.  It doesn’t work on older Apple external
LCDs which connect via DVI and USB.  I don’t know if it works on newer
external displays, such as Thunderbolt displays, because I don’t have
any to test with.  (Feedback welcome.)

As of macOS 10.12.4 with the introduction of Night Shift, the
documented APIs fail to work correctly and Apple does not provide
replacement APIs.  Therefore, `brightness` uses an [undocumented
method](https://github.com/nriley/brightness/issues/21) to adjust
brightness.

macOS 11 on M1/Apple Silicon Macs require yet another [undocumented
method](https://github.com/nriley/brightness/pull/36) to adjust
brightness (thanks to @jtbandes).

Usage Examples
--------------

Set 100% brightness: ```brightness 1```

Set 50% brightness: ```brightness 0.5```

Show current brightness: ```brightness -l```

````
% brightness
usage: brightness [-m|-d display] [-v] <brightness>
   or: brightness -l [-v]
% brightness -lv
display 0: main, active, awake, online, external, ID 0x1b56353c
	resolution 2560 x 1440 pt (5120 x 2880 px), origin (0, 0)
	physical size 599 x 340 mm
	IOKit flags 0x7; IOKit display mode ID 0x80005000
	usable for desktop GUI, uses OpenGL acceleration
display 0: brightness 0.500000
display 1: active, awake, online, external, ID 0x3f003f
	resolution 1112 x 834 pt (2224 x 1668 px) @ 60.0 Hz, origin (732, 1440)
	physical size 392 x 294 mm
	IOKit flags 0x7; IOKit display mode ID 0x4
	usable for desktop GUI, uses OpenGL acceleration
brightness: unable to get brightness of display 0x3f003f
% brightness -m 0.6
% brightness -l    
display 0: main, active, awake, online, external, ID 0x1b56353c
display 0: brightness 0.600000
[...]
````

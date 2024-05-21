# BCLM

BCLM is a wrapper to read and write battery charge level max (BCLM)/CHWA values to the System Management Controller (SMC) on Mac computers. It supports both Intel and Apple silicon. This project was inspired by several battery management solutions, including Apple's own battery health management.

The purpose of limiting the battery's max charge is to prolong battery health and to prevent damage to the battery. Various sources show that the optimal charge range for operation of lithium-ion batteries is between 40% and 80%, commonly referred to as the 40-80 rule [[1]](https://www.apple.com/batteries/why-lithium-ion/)[[2]](https://www.eeworldonline.com/why-you-should-stop-fully-charging-your-smartphone-now/)[[3]](https://www.csmonitor.com/Technology/Tech/2014/0103/40-80-rule-New-tip-for-extending-battery-life). This project is especially helpful to people who leave their Macs on the charger all day, every day.

## Installation

The easiest method to install BCLM is through `brew`.

BCLM is written in Swift and is also trivial to compile. Currently, it can only be compiled on macOS Catalina (10.15) or higher but it can run on OS X Mavericks (10.9) or higher.

A release zip is also provided with a signed and notarized binary for those who do not have development tools or are on an older macOS version.

### Brew

```
$ brew tap zackelia/formulae
$ brew install bclm
```

### From Source

```
$ make build
$ make test
$ sudo make install
```

### From Releases

```
$ unzip bclm.zip
$ sudo mkdir -p /usr/local/bin
$ sudo cp bclm /usr/local/bin
```

Note: For older versions of macOS, it may be necessary to install the [Swift 5 Runtime Support for Command Line Tools](https://support.apple.com/kb/dl1998?locale=en_US) if you get the following error: `dyld: Symbol not found`

## Usage

```
$ bclm
OVERVIEW: Battery Charge Level Max (BCLM) Utility.

USAGE: bclm <subcommand>

OPTIONS:
  --version               Show the version.
  -h, --help              Show help information.

SUBCOMMANDS:
  read                    Reads the BCLM value.
  write                   Writes a BCLM value.
  persist                 Persists bclm.
  unpersist               Unpersists bclm.

  See 'bclm help <subcommand>' for detailed help.
```

For Intel machines, when writing values, macOS charges slightly beyond the set value (~3%). In order to display 80% when fully charged, it is recommended to set the BCLM value to 77%. When charging while system is shut down or sleeping, the charging can go beyond set value more than average 3%.

```
$ sudo bclm write 77
$ bclm read
77
```

For Apple silicon machines, only the values 80 and 100 are supported and firmware >= 13.0 is required.

Note that in order to write values, the program must be run as root. This is not required for reading values.

## Persistence

The SMC can be reset by a startup shortcut or various other technical reasons. To ensure that the BCLM is always at its intended value, it should be persisted.

This will create a new plist in `/Library/LaunchDaemons` and load it via `launchctl`. It will persist with the current BCLM value and will update on subsequent BCLM writes.

```
$ sudo bclm persist
```

Likewise, it can be unpersisted which will unload the service and remove the plist.

```
$ sudo bclm unpersist
```

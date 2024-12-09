# Wireguard

Control Wireguard connections.

![wireguard-screenshot](./metadata/screenshot.png)

Many thanks for [alfred-wireguard](https://github.com/chrede88/alfred-wireguard) !

## Usage

### Commands

`disconnectAllWireguardConnections`: Disconnect all Wireguard connections.
`toggleWireguardConnection`: Toggle a specific Wireguard connection. Useful when using quicklinks.

### Options

`show national flag`: Show national flag, Default: `true`. Get the country code from the beginning of the Wireguard configuration name, eg: us-xxxx, gb09-xxxx, etc. Ignore the number after the country code, the rule comes from [morbae's rule](https://github.com/raycast/extensions/pull/5642) ;)
If the rule is not matched, use the default flag 🏴‍☠️.

### Quicklinks

You can use a Quicklink to toggle a specific Wireguard connection.
To do that, search for a connection -> Hit `Cmd + K` -> `Save as Quicklink`.

## License

This Raycast Extension is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).

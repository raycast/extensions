# Bluetooth Protocol

## Scope

The native helper implements the LINAK Bluetooth characteristics used by the IKEA IDÅSEN controller. Compatible LINAK desks can work, but only IDÅSEN hardware has been verified.

## Characteristics

| Purpose                 | Service UUID                           | Characteristic UUID                    |
| ----------------------- | -------------------------------------- | -------------------------------------- |
| Control command         | `99FA0001-338A-1024-8A49-009C0215F78A` | `99FA0002-338A-1024-8A49-009C0215F78A` |
| Height and speed output | `99FA0020-338A-1024-8A49-009C0215F78A` | `99FA0021-338A-1024-8A49-009C0215F78A` |
| Target height input     | `99FA0030-338A-1024-8A49-009C0215F78A` | `99FA0031-338A-1024-8A49-009C0215F78A` |

## Control payloads

The control characteristic accepts two-byte payloads:

| Action    | Payload |
| --------- | ------- |
| Move down | `46 00` |
| Move up   | `47 00` |
| Wake      | `FE 00` |
| Stop      | `FF 00` |

Normal target movement uses the target height characteristic. The helper writes a two-byte unsigned little-endian target every 400 milliseconds.

## Height conversion

The controller reports height as an unsigned 16-bit little-endian value. The value represents hundredths of a centimeter above the configured base height.

```text
height_cm = base_height_cm + raw_height / 100
raw_target = round((target_height_cm - base_height_cm) * 100)
```

The default base height is `62 cm`. Change it in **Desk Settings** when the displayed height has a constant offset.

Bytes three and four contain signed little-endian speed. The helper divides the raw value by 100 before reporting it.

## Discovery

**Desk Settings** runs a bounded five-second scan without connecting to a peripheral. The dropdown combines these sources:

- The desk identifier already stored by the extension.
- System-connected peripherals that expose the LINAK control service.
- Nearby advertisements that expose the control service or match the discovery name filter.

CoreBluetooth does not provide a complete list of paired Bluetooth devices. A discovered advertisement is therefore a possible desk until the first connection validates its services.

The fallback name match is case-insensitive. Its default value is `Desk`.

Saving settings stores the selected desk's macOS CoreBluetooth UUID. Future status and movement commands require that explicit selection and retrieve only that peripheral. The name filter is discovery-only. This UUID is local to macOS and is not the desk MAC address.

## Protocol changes

Treat protocol changes as safety-sensitive.

1. Verify the behavior against a primary implementation or captured controller behavior.
2. Add or update native self-tests.
3. Run status-only live verification.
4. Obtain explicit authorization before physical movement testing.
5. Keep the physical controller within reach.

## References

- [linak-desk-web protocol implementation](https://github.com/smailzhu/linak-desk-web)
- [IDÅSEN Desk Controller for Mac](https://github.com/DWilliames/idasen-desk-controller-mac)
- [Apple CoreBluetooth documentation](https://developer.apple.com/documentation/corebluetooth)

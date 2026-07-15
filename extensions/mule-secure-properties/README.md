# Mule Secure Properties

Encrypt and decrypt MuleSoft secure property values from Raycast using the official [Secure Properties Tool](https://docs.mulesoft.com/mule-runtime/latest/secure-configuration-properties).

## Requirements

- [Java](https://www.java.com/) 17 or later available on your `PATH` (`java -version`)
- A secure properties key (password) that matches the one configured in your Mule application

On first encrypt or decrypt, the extension downloads `secure-properties-tool.jar` from MuleSoft docs into your home directory and verifies its checksum.

## Setup

1. Install the extension
2. Open **Raycast Preferences → Extensions → Mule Secure Properties**
3. Set **Default Password** to your Mule secure properties key

The password field is prefilled from that preference. Edit it on the form when you need a different key for a single run.

## Commands

### Encrypt Property

Encrypt a plaintext value (for example a client secret or connection password). The result is copied to the clipboard and can be pasted into a Mule config as `![...]`.

### Decrypt Property

Decrypt a secure property value. Paste either the raw ciphertext or a value wrapped as `![...]` — the decrypt command can strip the wrapper automatically.

## Tips

- Use the same **algorithm**, **mode**, and **Use Random IV** setting for encrypt and decrypt that your Mule app uses
- AES keys must be 16, 24, or 32 characters; DES 8; DESede 24
- Enable **Use Random IV** when your Mule config sets `useRandomIVs="true"`
- **Wrap as ![...]** on encrypt prepares values for YAML/properties files
- Use **Copy CLI Command** to copy the equivalent `java -cp ... SecurePropertiesTool` invocation
- Algorithm/mode options are remembered after a successful encrypt or decrypt

## Related

- [Secure Configuration Properties](https://docs.mulesoft.com/mule-runtime/latest/secure-configuration-properties)
- [Secure Properties Tool](https://docs.mulesoft.com/mule-runtime/latest/secure-configuration-properties#secure_props_tool)

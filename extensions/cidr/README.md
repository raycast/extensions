# CIDR to IPv4 info

![preview](./metadata/cidr-1.png)

### description

Input one CIDR string, and it will help you convert it to more detailed info.

### Example

input: `10.0.0.0/24`

output:

| header         | content         |
| -------------- | --------------- |
| `range`        | `10.0.0.0/24`   |
| `netmask`      | `255.255.255.0` |
| `wildcardBits` | `0.0.0.255`     |
| `firstIp`      | `10.0.0.0`      |
| `firstIpInt`   | `167772160`     |
| `lastIp`       | `10.0.0.255`    |
| `lastIpInt`    | `167772415`     |
| `totalHost`    | `256`           |

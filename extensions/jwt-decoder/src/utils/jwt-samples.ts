// Sample keys used to populate a working example when the algorithm changes.
// The payload is identical across algorithms; only the key material differs.
export const SAMPLE_PAYLOAD = { sub: "itggood2420", name: "Im-Tae", iat: 1784784054, exp: 1984787654 };

export const SAMPLE_HS_SECRET =
  "NTNv7j0TuYARvmNMmWXo6fKvM4o6nv/aUi9ryX38ZH+L1bkrnD1ObOQ8JAUmHCBq7Iy7otZcyAagBLHVKvvYaIpmMuxmARQ97jUVG16Jkpkp1wXOPsrF9zwew6TpczyHkHgX5EuLg2MeBuiT/qJACs1J0apruOOJCg/gOtkjB4c=";

export const RSA_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDB7bGDz9j8QRAs
s7aJ8G7oncRtt5Y44TKXiP1qtWjRIr8WfGUZDCbQyOL9i4ALCtB4hQbDg4wefXxq
HXz+GKadVCABpJwb0VCFju6SKxNO8eMOysnayWsEj8Gdrfdh4qrSxqKdRl3/3VRK
oVc8Fvyd8nckzEsZW3+6RMIXLZrQxL46Kp1yh8+MDnLrCmXYlJw2uIejRXx1oCxI
rfMjRXpuK/pl1mke6TgCxrTJ02iud8/MxHU0w3r/zH1AvsVtoMB5WWBemELlhfOe
51cVRCqq8JJh7kg3fXUS5Jcob2TclfshcAg/UwkVyvEvXpW72SliuuwCm4H0iKgs
2R2Mbgs1AgMBAAECggEAAn8oqqmFoePFjUnIBxkbGHAVjBMRwkw17kkDeDj7Lzwb
CTNTSuIC6uu3Lmv6G0pJmk+eIWzDZE4ZyLT1+8B9/qcLXXIM13fXqUyIikW3Myw+
j91xAVnYAKBILhtEBNTZ/ao0hEFYaveiwu42VQ33tSHewlDGA77Pk2qYtBswc9Ea
3ZNV1TOnzRGCkx5H84yMvZ3omDg06/coj7uA1n5Ccq/S6IA3077pfCTqEaDalP1R
JjIq+zN9DGWwjI0zr4bpXuL+7Q5f9BOZjtX24+miUhnMzksG3INSIGYIfTJfxASf
GtK+wiADIWpKfAqcHY6WE5qqnXvsztruad3ALX/tEQKBgQD035VMysxLtShh9Qsm
ycgEpZ6DEW47l5AiPJlh5RJ/GMF85VKlxZLHdxeXL2Yvv0KjcLhRQ1PcwD/MXLHh
M0SsR7bE5R2EM+tBpOH+jTZQ85qJUP4UCusg9eKxy+uqZ6bHulp62TER1ATk8ncG
mmKgab7HZIXukEUVSS+w5MzV8QKBgQDKvYJN1mKKOAvfd3GvhZU1ScFvQR5vds3P
+k+14WccHjBvS4gjikPwCRkEGqPFnHvmpdS2+9Y+7+ijxWfq6MoYWeCPK7dFkrdm
+ouI9lXWwzVLtjHEz7/fic5tN9gC2iesU8mZkxtKCIeAHVJPl5Q6e+hHdrR4/G0P
HsbECTg1hQKBgHymh+i0XzS2vhzHUWroUoJTEJKlv9hj+cID2QxlQHokTvJWBjFO
lr4k2IRkY38wvCpYyerL/BemYZOVKBN8NpwAUYB/JPxUNZCP717V4W1p5CO8b+oh
+LkpkcFyDcALzXFkYoSgpQLvS6KD7qUU19nSmoQDns3m8NO6EqXYgpDxAoGAU2bC
Q+L9hn6n47XvPpVlXBaLTIktTA1DfVsrj1a6ZAbHRgF8b6JhcE1NzTJoTNKi5a8y
YlQXPqzStwxuQ2SgPoQ6rKr/Kc/BQsuuuxkbFs4XDp5UuvH7rKm0EZn3crTrvSh6
toKdp0b69ukZA0UH5UcztrJOa7br5lxyyBJC3UECgYA93xgeGqZmOrl4s/7Fk84A
WLVCNOOBZOGRl7IyWHigB57RUopnOIiUhPDHpXY/6kCH48M88Bu6lhbd+JUxLevN
YTuMtlbbMu8LtjD47mYRdTE40WfnGOQ6cbW0tyR9DPtsxEWKpDnjEC1T8/ejWYZu
QT+sepkqmovf7ELH/5Avvw==
-----END PRIVATE KEY-----`;
export const RSA_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwe2xg8/Y/EEQLLO2ifBu
6J3EbbeWOOEyl4j9arVo0SK/FnxlGQwm0Mji/YuACwrQeIUGw4OMHn18ah18/him
nVQgAaScG9FQhY7ukisTTvHjDsrJ2slrBI/Bna33YeKq0sainUZd/91USqFXPBb8
nfJ3JMxLGVt/ukTCFy2a0MS+OiqdcofPjA5y6wpl2JScNriHo0V8daAsSK3zI0V6
biv6ZdZpHuk4Asa0ydNornfPzMR1NMN6/8x9QL7FbaDAeVlgXphC5YXznudXFUQq
qvCSYe5IN311EuSXKG9k3JX7IXAIP1MJFcrxL16Vu9kpYrrsApuB9IioLNkdjG4L
NQIDAQAB
-----END PUBLIC KEY-----`;

export const ES256_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgEuFD+rk809cELPmt
fajX0CI6+afBwytOqe/ugm2T6nyhRANCAARzLRtjumk/IT/rJu5/pczBNuPYFXPN
HznL9m+hMsmcqZLYu5IpGfgsbSEMPOEpEsU5bIaGOWkhWwuk+yS4V/lP
-----END PRIVATE KEY-----`;
export const ES256_PUBLIC = `-----BEGIN PUBLIC KEY-----
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEcy0bY7ppPyE/6ybuf6XMwTbj2BVz
zR85y/ZvoTLJnKmS2LuSKRn4LG0hDDzhKRLFOWyGhjlpIVsLpPskuFf5Tw==
-----END PUBLIC KEY-----`;

export const ES384_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIG2AgEAMBAGByqGSM49AgEGBSuBBAAiBIGeMIGbAgEBBDCQ6NDAfAASJoFomVkY
gaW0vQ8pY7CvYG7VXjylGrEiwqin9nYXgXA2HsBwxxdJp8OhZANiAASo6rCzdb6f
vT3MiycmRv4uBQZ4gGdL+X9OnKsg3Vpq036yDCWB3hajrp6lyVyvrurV0Lvpy7Jn
IuTMHSZ4Nd1T69UxVUhWX8Gy8m6IeFhHapjp9puQolikJm1MsFxvHac=
-----END PRIVATE KEY-----`;
export const ES384_PUBLIC = `-----BEGIN PUBLIC KEY-----
MHYwEAYHKoZIzj0CAQYFK4EEACIDYgAEqOqws3W+n709zIsnJkb+LgUGeIBnS/l/
TpyrIN1aatN+sgwlgd4Wo66epclcr67q1dC76cuyZyLkzB0meDXdU+vVMVVIVl/B
svJuiHhYR2qY6fabkKJYpCZtTLBcbx2n
-----END PUBLIC KEY-----`;

export const ES512_PRIVATE = `-----BEGIN PRIVATE KEY-----
MIHuAgEAMBAGByqGSM49AgEGBSuBBAAjBIHWMIHTAgEBBEIBNwkeP+Z4stUWtDQW
2YzfbI/SPPOMfJgBJ+J4IV0onpcvEgWjuzWWNNubu277fvuZgQMF5n3DOqTlWCMn
wZJIDmyhgYkDgYYABAFXU2ft3WdVv+5tqDvr7gsSYGY4qsMJw2WHnhU/fEVuqWhR
5fhFKEsnf87c/GxWec6uETlYJ+GII9O2BTMozlv7yAFIYTqxH6VVOHpnrreZ82J0
mndIKOC3sb8IOCtUMlNOQxd8fQXn0B2ufv4xUXR5VzBoHfN3VxGF0AF3qjMUN1LF
6g==
-----END PRIVATE KEY-----`;
export const ES512_PUBLIC = `-----BEGIN PUBLIC KEY-----
MIGbMBAGByqGSM49AgEGBSuBBAAjA4GGAAQBV1Nn7d1nVb/ubag76+4LEmBmOKrD
CcNlh54VP3xFbqloUeX4RShLJ3/O3PxsVnnOrhE5WCfhiCPTtgUzKM5b+8gBSGE6
sR+lVTh6Z663mfNidJp3SCjgt7G/CDgrVDJTTkMXfH0F59Adrn7+MVF0eVcwaB3z
d1cRhdABd6ozFDdSxeo=
-----END PUBLIC KEY-----`;

export interface SampleKeys {
  secret: string;
  secretBase64: boolean;
  privatePem: string;
  publicPem: string;
}

/** Example key material for a given algorithm, so switching algorithms yields a working sample. */
export function sampleKeysFor(alg: string): SampleKeys {
  const empty: SampleKeys = { secret: "", secretBase64: false, privatePem: "", publicPem: "" };
  if (alg.startsWith("HS")) return { ...empty, secret: SAMPLE_HS_SECRET, secretBase64: true };
  if (alg.startsWith("RS") || alg.startsWith("PS")) return { ...empty, privatePem: RSA_PRIVATE, publicPem: RSA_PUBLIC };
  if (alg === "ES256") return { ...empty, privatePem: ES256_PRIVATE, publicPem: ES256_PUBLIC };
  if (alg === "ES384") return { ...empty, privatePem: ES384_PRIVATE, publicPem: ES384_PUBLIC };
  if (alg === "ES512") return { ...empty, privatePem: ES512_PRIVATE, publicPem: ES512_PUBLIC };
  return empty;
}

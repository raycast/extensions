import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";
import { ACCESS_TOKEN } from "./config";

const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Wave",
  providerIcon: "wave.png",
  description: "Connect your Wave account",
});

export const provider = new OAuthService({
  client,
  clientId: "5.TcftcT2oqkv43GjlpGxsPXdZh749u1YI2MH50W",
  authorizeUrl:
    "https://oauth.raycast.com/v1/authorize/FM5tM_5g15vFDnfj7nm3vtkcoByMUAI69cCl58SB27ud1QGVoveYNA_BgjcsXvWyDqBQVyZoLYaUlIlZvpFcPvXxK7MqOHeO5hN5y0qwEnShw9Hv9PofZM7xqADLOih2-W62ftFCaRDVJIur7F0ccG7xVu8t8wSt3VXL5i7o3IQIPQ7ODWqswTt6Fx5KxL5y5MuqAgxP2jr7Xwz-yWQWc_A7EaKPxbno2oTPaz9AArfAd-t-YaPbXvTL3bi69cu1CmVTJygRdhM",
  tokenUrl:
    "https://oauth.raycast.com/v1/token/_wJ5kXg1rLhO75Pr62ge83y20RUwQ7SITWBOL86St6DKEY-FK1p9yWdFqDhcFE_SgHgaYril7-RoS3JfDNs5lVX8xQ2iEX2LAXmDQV8armzVls1lWJYKHVSw123e6h9d-C3JUkDzhYfBiWY6HaMrn2E03dhqiuiBN5SOLAfCqZKTgq1ULnvfJ7Nexi82FN54jsrn2gyHDspcz6d89jWStRIPvFSeVt3C3EEPmdnWbm7mKZNmxhuoFrOZ1B8N-KOObts8Bg",
  refreshTokenUrl:
    "https://oauth.raycast.com/v1/refresh-token/TQsitwYgPmfM2Tm6ZC5NMaBiOIztfOmzALSrh4UM0o4SdlSqRCvGuJ3i56HXpOkkuiwOc0TtKfxtfBKDy96nmDKMfewczvXkpNnH1afTexQYGUDTQOpUYBE8Cxo9XMRdqdJKC2OIUitHjCXZHEAQDLaGNo5AXMeWKO4Kkg6MLooZuy2Zuh16neM6-DCwJ8Qs1ZLPHdF6ps8vZRd-viNgscOto3NwUXa4iOVWLXsn8xrVD3tOcCcDvC3R-JOIzn-5ipsSZQ",
  scope: "business:read customer:* invoice:read product:* user:read",
  personalAccessToken: ACCESS_TOKEN,
});

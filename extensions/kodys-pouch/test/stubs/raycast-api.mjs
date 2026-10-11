export function getPreferenceValues() {
  return (
    globalThis.__KODY_TEST_PREFS__ ?? {
      username: "testuser",
      discoveryKodyId: "raycast-kodys-pouch",
      pouchWebhookUrl: "https://hooks.test/pouch",
    }
  );
}

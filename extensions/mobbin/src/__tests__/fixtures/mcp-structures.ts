// Sanitized structural fixtures. Values are deliberately synthetic: no
// credentials, signed URLs, provider assets, or search content are retained.
export const mcpScreenFixture = {
  screens: [
    {
      id: "screen-example",
      app: { name: "Example App" },
      platform: "ios",
      mobbinUrl: "https://mobbin.com/example/screen",
      image: {
        data: "AA==",
        mimeType: "image/png",
        width: 390,
        height: 844,
        expiresAt: "2030-01-01T00:00:00Z",
      },
    },
  ],
};

export const mcpFlowFixture = {
  data: {
    flows: [
      {
        flow_id: "flow-example",
        flow_name: "Example Flow",
        app: { name: "Example App" },
        platform: "ios",
        mobbin_url: "https://mobbin.com/example/flow",
        screen_sequence: [
          {
            screen: {
              screen_id: "flow-screen-one",
              image: { data: "AA==", mimeType: "image/png" },
            },
          },
          {
            screen: {
              screen_id: "flow-screen-two",
              image: { data: "AA==", mimeType: "image/png" },
            },
          },
        ],
      },
    ],
  },
};

export const mcpSectionFixture = {
  sections: [
    {
      sectionId: "section-example",
      sectionName: "Pricing",
      website: { domain: "example.invalid" },
      mobbinLink: "https://mobbin.com/example/section",
      image: {
        data: "AA==",
        mimeType: "image/webp",
        width: 1440,
        height: 900,
      },
    },
  ],
};

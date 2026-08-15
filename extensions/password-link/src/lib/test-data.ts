// Toggle this to enable/disable test data
export const ENABLE_TEST_DATA = false;

export const testSecrets = ENABLE_TEST_DATA
  ? [
      {
        id: "1",
        created_at: "2024-01-15T10:00:00Z",
        message: "Acme Corp Admin Portal",
        description: "Admin login for Acme Corp",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 2,
        max_views: 2,
        views: [
          {
            viewed_at: "2024-01-15T12:00:00Z",
            viewed_by_ip: "192.168.1.10",
            viewed_by_user_agent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          {
            viewed_at: "2024-01-15T14:30:00Z",
            viewed_by_ip: "10.0.0.2",
            viewed_by_user_agent:
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        ],
      },
      {
        id: "2",
        created_at: "2024-01-14T10:00:00Z",
        message: "Production PostgreSQL Database",
        description: "DB credentials for production",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 0,
        max_views: 1,
        views: [],
      },
      {
        id: "3",
        created_at: "2024-01-13T10:00:00Z",
        message: "Stripe Production API Keys",
        description: "API keys for Stripe",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 2,
        max_views: 3,
        views: [
          {
            viewed_at: "2024-01-13T11:00:00Z",
            viewed_by_ip: "172.16.0.5",
            viewed_by_user_agent:
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
          },
          {
            viewed_at: "2024-01-13T15:45:00Z",
            viewed_by_ip: "203.0.113.42",
            viewed_by_user_agent:
              "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          },
        ],
      },
      {
        id: "4",
        created_at: "2024-01-12T10:00:00Z",
        message: "AWS EC2 Instance Access",
        description: "Access credentials for EC2",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 1,
        max_views: 1,
        views: [
          {
            viewed_at: "2024-01-12T13:20:00Z",
            viewed_by_ip: "198.51.100.23",
            viewed_by_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0",
          },
        ],
      },
      {
        id: "5",
        created_at: "2024-01-11T10:00:00Z",
        message: "Docker Registry Credentials",
        description: "DockerHub login",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 0,
        max_views: 1,
        views: [],
      },
      {
        id: "6",
        created_at: "2024-01-10T10:00:00Z",
        message: "GitHub Personal Access Token",
        description: "PAT for GitHub",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 1,
        max_views: 1,
        views: [
          {
            viewed_at: "2024-01-10T16:00:00Z",
            viewed_by_ip: "203.0.113.99",
            viewed_by_user_agent:
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Safari/605.1.15",
          },
        ],
      },
      {
        id: "7",
        created_at: "2024-01-09T10:00:00Z",
        message: "Slack Bot Configuration",
        description: "Slack bot token",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 0,
        max_views: 1,
        views: [],
      },
      {
        id: "8",
        created_at: "2024-01-08T10:00:00Z",
        message: "Redis Cache Credentials",
        description: "Redis credentials",
        view_button: true,
        captcha: false,
        password: undefined,
        expiration: 24,
        expired: false,
        view_times: 1,
        max_views: 1,
        views: [
          {
            viewed_at: "2024-01-08T18:00:00Z",
            viewed_by_ip: "10.0.0.8",
            viewed_by_user_agent:
              "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
          },
        ],
      },
    ]
  : [];

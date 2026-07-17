export const FORM_OPTIONS = {
  methods: [
    { value: "GET", title: "GET" },
    { value: "HEAD", title: "HEAD" },
  ],
  intervals: [
    { value: "30", title: "30 seconds" },
    { value: "60", title: "1 minute" },
    { value: "120", title: "2 minutes" },
    { value: "180", title: "3 minutes" },
    { value: "300", title: "5 minutes" },
    { value: "600", title: "10 minutes" },
    { value: "900", title: "15 minutes" },
    { value: "1800", title: "30 minutes" },
    { value: "3600", title: "1 hour" },
  ],
  timeouts: [
    { value: "1000", title: "1 second" },
    { value: "2000", title: "2 seconds" },
    { value: "3000", title: "3 seconds" },
    { value: "4000", title: "4 seconds" },
    { value: "5000", title: "5 seconds" },
    { value: "6000", title: "6 seconds" },
    { value: "7000", title: "7 seconds" },
    { value: "8000", title: "8 seconds" },
    { value: "9000", title: "9 seconds" },
    { value: "10000", title: "10 seconds" },
    { value: "15000", title: "15 seconds" },
    { value: "20000", title: "20 seconds" },
    { value: "25000", title: "25 seconds" },
    { value: "30000", title: "30 seconds" },
  ],
  regions: [
    { value: "as-jpn-hnd", title: "Tokyo, Japan" },
    { value: "as-sgp-sin", title: "Singapore" },
    { value: "as-tha-bkk", title: "Bangkok, Thailand" },
    { value: "eu-deu-fra", title: "Frankfurt, Germany" },
    { value: "eu-gbr-lhr", title: "London, UK" },
    { value: "eu-swe-arn", title: "Stockholm, Sweden" },
    { value: "na-mex-mex", title: "Mexico City, Mexico" },
    { value: "na-usa-iad", title: "Washington DC, USA" },
    { value: "na-usa-sea", title: "Seattle, USA" },
    { value: "oc-aus-syd", title: "Sydney, Australia" },
    { value: "sa-bra-gru", title: "São Paulo, Brazil" },
  ],
  confirmations: [
    { value: "1", title: "1 confirmation" },
    { value: "2", title: "2 confirmations" },
    { value: "3", title: "3 confirmations" },
    { value: "4", title: "4 confirmations" },
    { value: "5", title: "5 confirmations" },
  ],
} as const;

export const API_BASE_URL = "https://api.phare.io/uptime";

export const STATUS_COLORS = {
  fetching: "#38bdf8", // blue
  online: "#4ade80", // green
  offline: "#f87171", // red
  partial: "#facc15", // yellow
  paused: "#a1a1aa", // gray
} as const;

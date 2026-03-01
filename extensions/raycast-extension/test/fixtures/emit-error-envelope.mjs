const payload = {
  error: "invalid_api_key",
  message: "API key rejected by ZBD API",
  details: {
    status: 401,
  },
};

process.stdout.write(`${JSON.stringify(payload)}\n`);
process.exit(1);

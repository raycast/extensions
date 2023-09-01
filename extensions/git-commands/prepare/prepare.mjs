// Prepare

// Small function to colorize the output
const color = (n) => `\x1b[${{ red: 31, green: 32 }[n]};1m%s\x1b[0m`

// Show a welcome message
console.log(color('green'), 'Welcome to Git Commands');

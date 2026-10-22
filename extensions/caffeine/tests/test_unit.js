const { formatDuration, formatRemainingTime, formatTime } = require('../.tmp/dist/utils/time.js');
const { TIMER_PRESETS } = require('../.tmp/dist/utils/types.js');

console.log('====================================================');
console.log('  RUNNING CAFFEINE UNIT TEST SUITE');
console.log('====================================================\n');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Time formatting tests
assert(formatDuration(0) === 'Indefinitely', 'formatDuration(0) is Indefinitely');
assert(formatDuration(300) === '5 minutes', 'formatDuration(300) is 5 minutes');
assert(formatDuration(600) === '10 minutes', 'formatDuration(600) is 10 minutes');
assert(formatDuration(900) === '15 minutes', 'formatDuration(900) is 15 minutes');
assert(formatDuration(1800) === '30 minutes', 'formatDuration(1800) is 30 minutes');
assert(formatDuration(2700) === '45 minutes', 'formatDuration(2700) is 45 minutes');
assert(formatDuration(3600) === '1 hour', 'formatDuration(3600) is 1 hour');
assert(formatDuration(7200) === '2 hours', 'formatDuration(7200) is 2 hours');
assert(formatDuration(5400) === '1 hour 30 minutes', 'formatDuration(5400) is 1 hour 30 minutes');

// 2. Timer presets integrity (3 quick presets)
assert(Array.isArray(TIMER_PRESETS) && TIMER_PRESETS.length === 3, 'TIMER_PRESETS contains exactly 3 quick items');
const expectedMinutes = [15, 30, 60];
TIMER_PRESETS.forEach((preset, idx) => {
  assert(preset.minutes === expectedMinutes[idx], `Preset ${preset.id} has ${expectedMinutes[idx]} minutes`);
  assert(preset.durationSeconds === expectedMinutes[idx] * 60, `Preset ${preset.id} duration in seconds matches`);
});

// 3. Custom duration validation logic tests
function validateMinutes(rawInput) {
  const raw = (rawInput || '').trim();
  if (!raw || !/^\d+$/.test(raw)) {
    return 'Enter a duration between 1 and 10,080 minutes.';
  }
  const minutes = parseInt(raw, 10);
  if (isNaN(minutes) || minutes < 1 || minutes > 10080) {
    return 'Enter a duration between 1 and 10,080 minutes.';
  }
  return null;
}

assert(validateMinutes('') !== null, 'Rejects empty input');
assert(validateMinutes('  ') !== null, 'Rejects whitespace-only input');
assert(validateMinutes('0') !== null, 'Rejects 0');
assert(validateMinutes('-5') !== null, 'Rejects negative numbers');
assert(validateMinutes('15.5') !== null, 'Rejects decimals');
assert(validateMinutes('abc') !== null, 'Rejects non-numeric text');
assert(validateMinutes('10081') !== null, 'Rejects values > 10,080 (7 days)');
assert(validateMinutes('1') === null, 'Accepts 1 minute');
assert(validateMinutes('5') === null, 'Accepts 5 minutes');
assert(validateMinutes('10') === null, 'Accepts 10 minutes');
assert(validateMinutes('20') === null, 'Accepts 20 minutes');
assert(validateMinutes('45') === null, 'Accepts 45 minutes');
assert(validateMinutes('60') === null, 'Accepts 60 minutes');
assert(validateMinutes('90') === null, 'Accepts 90 minutes');
assert(validateMinutes('120') === null, 'Accepts 120 minutes');
assert(validateMinutes('300') === null, 'Accepts 300 minutes');
assert(validateMinutes('1000') === null, 'Accepts 1000 minutes');
assert(validateMinutes('10080') === null, 'Accepts 10,080 minutes');

// 4. Remaining time tests
assert(formatRemainingTime(null) === 'Indefinite', 'formatRemainingTime(null) is Indefinite');
assert(formatRemainingTime(undefined) === 'Indefinite', 'formatRemainingTime(undefined) is Indefinite');
assert(formatRemainingTime(Date.now() - 5000) === 'Expiring now', 'Past timestamp returns Expiring now');

const futureMs15m = Date.now() + 15 * 60 * 1000;
assert(formatRemainingTime(futureMs15m).includes('15m'), '15m in future contains 15m');

const futureMs2h = Date.now() + 2 * 60 * 60 * 1000;
assert(formatRemainingTime(futureMs2h).includes('2h'), '2h in future contains 2h');

// 5. Clock formatting test
const sampleTime = new Date('2026-08-24T10:30:00').getTime();
const formattedTime = formatTime(sampleTime);
assert(typeof formattedTime === 'string' && formattedTime.length > 0, `formatTime returns valid string: ${formattedTime}`);

console.log('\n====================================================');
console.log('  ALL UNIT TESTS PASSED SUCCESSFULLY!');
console.log('====================================================\n');

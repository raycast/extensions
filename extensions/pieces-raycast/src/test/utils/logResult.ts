export default function logTestResult(name: string) {
  const banner =
    "|------------------------------------------------------------------------|";

  let testString = `✓✓✓ Testing ${name} was a success! ✓✓✓`;

  const halfDiff = (banner.length - testString.length) / 2;

  for (let i = 0; i < halfDiff; i++) {
    testString = " " + testString;
  }
  const string = `\n${banner}\n${testString}\n${banner}`;
  console.log(string);
}

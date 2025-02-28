import { expect } from "chai";
import ClipboardController, {
  ClipboardAsset,
} from "../controllers/ClipboardController";
import { Clipboard } from "@raycast/api";
import { randomUUID } from "crypto";
import sleep from "../utils/sleep";
import logTestResult from "./utils/logResult";

export default async function testClipboardController() {
  await ClipboardController.getInstance().updateHistory(); // make sure the clipboard history is updated for the tests
  const items = ClipboardController.getInstance().getHistory();
  let events = 0;

  // event items should be the latest clipboard history
  // it is used in the tests to ensure this is correct
  let eventItems: ClipboardAsset[] = [];
  const unsubscribe = ClipboardController.getInstance().controller.listen(
    (updatedItems) => {
      events += 1;
      eventItems = updatedItems;
    },
  );

  await ClipboardController.getInstance().updateHistory();
  await sleep(50);
  expect(events).to.eq(1); // should get a single event each time that update history is called
  expect(items.length).to.eq(
    // should have the same number of items if the history did not change
    eventItems.length,
    "Items is not the same as event items",
  );

  const material = `const id = ${randomUUID()};`;
  await Clipboard.copy(material); // copy to update history
  await sleep(50);
  await ClipboardController.getInstance().updateHistory(); // call update history to update the clipboard controller values
  await sleep(50);

  if (items.length !== 30)
    expect(eventItems.length - 1).to.eq(
      items.length,
      "There is not one extra item",
    ); // should have one extra item
  expect(items.length <= 30).to.eq(true);
  expect(eventItems[0].clipboard.text).to.eq(
    material,
    "Recently copied is not first item",
  ); // the recently copied item should be at the 0 index
  expect(events).to.be.gt(
    1,
    "There was not another event fired by clipboard controller",
  ); // should get an event

  let intervalId: NodeJS.Timeout | undefined = undefined;
  const valid = await new Promise<boolean>((res) => {
    let i = 0;
    intervalId = setInterval(() => {
      if (eventItems[0].ext) {
        res(true);
      }
      i++;
      if (i > 100) {
        // after 5 seconds there should be an extension
        res(false);
      }
    }, 50);
  });
  clearInterval(intervalId);

  expect(valid).to.eq(true, "Item did not get enriched in 5 seconds or less"); // the clipboard item should be enriched within up to 5 seconds of the clipboard controller being updated

  logTestResult("clipboard controller");
  unsubscribe();
}

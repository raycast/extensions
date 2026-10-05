import { Form } from "@raycast/api";
import { useState } from "react";
import type { GoogleBusinessMetadata } from "../api/types";
import { GOOGLE_BUTTONS } from "./google-business";

export function GoogleBusinessFields({
  postType,
  onPostTypeChange,
}: {
  postType: GoogleBusinessMetadata["type"];
  onPostTypeChange: (type: GoogleBusinessMetadata["type"]) => void;
}) {
  const [hasTime, setHasTime] = useState(false);

  return (
    <>
      <Form.Separator />
      <Form.Dropdown
        id="googlePostType"
        title="Google Post Type"
        value={postType}
        onChange={(v) => onPostTypeChange(v as GoogleBusinessMetadata["type"])}
      >
        <Form.Dropdown.Item value="whats_new" title="What's New" />
        <Form.Dropdown.Item value="offer" title="Offer" />
        <Form.Dropdown.Item value="event" title="Event" />
      </Form.Dropdown>

      {postType === "whats_new" && (
        <>
          <Form.Dropdown
            id="googleWhatsNewButton"
            title="Action Button"
            defaultValue="none"
          >
            {GOOGLE_BUTTONS.map((b) => (
              <Form.Dropdown.Item
                key={b.value}
                value={b.value}
                title={b.title}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="googleWhatsNewLink"
            title="Action Button Link"
            placeholder="https://example.com (optional)"
          />
        </>
      )}

      {postType === "offer" && (
        <>
          <Form.TextField
            id="googleOfferTitle"
            title="Offer Title"
            placeholder="Title of the offer"
          />
          <Form.DatePicker
            id="googleOfferStartDate"
            title="Offer Start Date"
            type={Form.DatePicker.Type.DateTime}
          />
          <Form.DatePicker
            id="googleOfferEndDate"
            title="Offer End Date"
            type={Form.DatePicker.Type.DateTime}
          />
          <Form.TextField
            id="googleOfferCode"
            title="Coupon Code"
            placeholder="Coupon code (optional)"
          />
          <Form.TextField
            id="googleOfferLink"
            title="Offer Link"
            placeholder="https://example.com (optional)"
          />
          <Form.TextArea
            id="googleOfferTerms"
            title="Terms & Conditions"
            placeholder="Terms and conditions of the offer (optional)"
          />
        </>
      )}

      {postType === "event" && (
        <>
          <Form.TextField
            id="googleEventTitle"
            title="Event Title"
            placeholder="Title of the event"
          />
          <Form.DatePicker
            id="googleEventStartDate"
            title="Event Start Date"
            type={Form.DatePicker.Type.DateTime}
          />
          <Form.DatePicker
            id="googleEventEndDate"
            title="Event End Date"
            type={Form.DatePicker.Type.DateTime}
          />
          <Form.Checkbox
            id="googleEventHasTime"
            label="Specify Event Time"
            value={hasTime}
            onChange={setHasTime}
            info="Whether to set a specific start/end time for the event. If disabled, the event is posted as an all-day event."
          />
          {hasTime && (
            <>
              <Form.TextField
                id="googleEventStartTime"
                title="Event Start Time"
                placeholder="e.g. 14:30"
              />
              <Form.TextField
                id="googleEventEndTime"
                title="Event End Time"
                placeholder="e.g. 18:00"
              />
            </>
          )}
          <Form.Dropdown
            id="googleEventButton"
            title="Action Button"
            defaultValue="none"
          >
            {GOOGLE_BUTTONS.map((b) => (
              <Form.Dropdown.Item
                key={b.value}
                value={b.value}
                title={b.title}
              />
            ))}
          </Form.Dropdown>
          <Form.TextField
            id="googleEventLink"
            title="Action Button Link"
            placeholder="https://example.com (optional)"
          />
        </>
      )}
    </>
  );
}

import { forwardRef } from "react";
import { Form } from "@raycast/api";

import type { ActivitySelectProps } from "@/src/types";

export const ActivitySelect = forwardRef<Form.Dropdown, ActivitySelectProps>(
  ({ id, title, placeholder, onBlur, onChange }, ref) => (
    <Form.Dropdown
      ref={ref}
      id={id}
      title={title}
      placeholder={placeholder}
      onBlur={onBlur}
      onChange={onChange}
      defaultValue="16"
    >
      <Form.Dropdown.Item key={16} value="16" title="Estimation" />
      <Form.Dropdown.Item key={147} value="147" title="Bench process" />
      <Form.Dropdown.Item key={17} value="17" title="Bugfix" />
      <Form.Dropdown.Item key={141} value="141" title="Client request/issues" />
      <Form.Dropdown.Item key={146} value="146" title="Consultancy" />
      <Form.Dropdown.Item key={18} value="18" title="Content" />
      <Form.Dropdown.Item key={19} value="119" title="Content-Outstaffing" />
      <Form.Dropdown.Item key={121} value="121" title="Corrections after Feedback" />
      <Form.Dropdown.Item key={8} value="8" title="Design" />
      <Form.Dropdown.Item key={140} value="140" title="Developers request/issues" />
      <Form.Dropdown.Item key={9} value="9" title="Development" />
      <Form.Dropdown.Item key={15} value="15" title="Document" />
      <Form.Dropdown.Item key={144} value="144" title="General Tasks" />
      <Form.Dropdown.Item key={149} value="149" title="Handling complaints" />
      <Form.Dropdown.Item key={139} value="139" title="Job/salary assessments" />
      <Form.Dropdown.Item key={60} value="60" title="Merketing" />
      <Form.Dropdown.Item key={12} value="12" title="Meeting" />
      <Form.Dropdown.Item key={142} value="142" title="Offboarding" />
      <Form.Dropdown.Item key={138} value="138" title="Onboarding" />
      <Form.Dropdown.Item key={59} value="59" title="PM" />
      <Form.Dropdown.Item key={120} value="120" title="Promotion-Outstaffing" />
      <Form.Dropdown.Item key={58} value="58" title="Regression Testing" />
      <Form.Dropdown.Item key={143} value="143" title="Reports" />
      <Form.Dropdown.Item key={40} value="40" title="Research" />
      <Form.Dropdown.Item key={57} value="57" title="Self Bugfix" />
      <Form.Dropdown.Item key={148} value="148" title="Situation/Health check" />
      <Form.Dropdown.Item key={14} value="14" title="Support" />
      <Form.Dropdown.Item key={11} value="11" title="Testing" />
      <Form.Dropdown.Item key={150} value="150" title="commun. with clients (letters)" />
      <Form.Dropdown.Item key={151} value="151" title="non-UA invoices" />
    </Form.Dropdown>
  )
);

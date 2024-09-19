import { ActionPanel, Form, Action, showToast, Toast, Icon, Color } from "@raycast/api";
import React, { useEffect, useState } from "react";
import { Build, App, betaGroupsSchema, buildSchemasWithBetaGroups, BetaGroup, betaBuildLocalizationsSchema, BuildWithBetaDetailAndBetaGroups, buildsWithBetaDetailSchema, AppStoreVersion } from "../Model/schemas";
import { useAppStoreConnectApi, fetchAppStoreConnect } from "../Hooks/useAppStoreConnect";

export default function InviteUsersFromCSV() {
    return (
        <Form>
            <Form.FilePicker title="CSV File" id="files" allowMultipleSelection={false} info="Import testers from a CSV file. The CSV file must be in the format: first name, last name, and email address" />
        </Form>
    );
}

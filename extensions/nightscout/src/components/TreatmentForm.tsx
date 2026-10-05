import { Form, ActionPanel, Action, showToast, Toast, popToRoot, Icon, Cache } from "@raycast/api";
import { useForm } from "@raycast/utils";
import { treatmentService, getTreatmentConfig } from "../services/treatmentService";
import { TREATMENTS_LAST_ENTERED_NAME_CACHE_KEY } from "../constants";
import { TreatmentFormModel, TreatmentFormConverter, AppError } from "../types";
import { handleAppError } from "../utils/errorHandling";
import { useProfileData } from "../hooks";
import { useEffect, useState, useMemo } from "react";

export enum InputGroup {
  GLUCOSE_MEASUREMENT,
  MEAL_MACROS,
  INSULIN_GIVEN,
  COMBO_SPLIT,
  DURATION,
  CARB_TIMING,
  TEMP_BASAL,
  SENSOR_CHANGE,
  PROFILE_SWITCH,
  EVENT_TIME,
  ENTERED_BY,
  NOTES,
}

interface TreatmentFormBaseProps {
  eventType: string;
  enabledInputs: { group: InputGroup; required: boolean }[];
  // some props for setting initial values
  profileName?: string;
}

export function TreatmentFormBase({ eventType, enabledInputs, profileName }: TreatmentFormBaseProps) {
  const cache = new Cache();
  const { profiles } = useProfileData();
  const [selectedProfile, setSelectedProfile] = useState<string>(
    profileName || profiles?.[0]?.defaultProfile || "Default",
  );

  const isProfilesLoaded = profiles && profiles.length > 0;

  useEffect(() => {
    if (isProfilesLoaded) {
      const defaultProfile = profiles[0].defaultProfile;
      const availableProfiles = Object.keys(profiles[0].store);

      // prioritize profileName if valid
      if (profileName && availableProfiles.includes(profileName)) {
        setSelectedProfile(profileName);
      } else if (!availableProfiles.includes(selectedProfile)) {
        setSelectedProfile(defaultProfile || "Default");
      }
    } else {
      // reset to Default if profiles are not loaded
      setSelectedProfile("Default");
    }
  }, [isProfilesLoaded, profiles, profileName, selectedProfile]);

  const dropdownItems = useMemo(() => {
    if (isProfilesLoaded) {
      const profileNames = Object.keys(profiles[0].store);
      const defaultProfile = profiles[0].defaultProfile;

      // sort profiles to show default first
      return [defaultProfile, ...profileNames.filter((name) => name !== defaultProfile)];
    }
    return ["Default"];
  }, [isProfilesLoaded, profiles]);

  const hasInput = (group: InputGroup) => enabledInputs.some((input) => input.group === group);
  const isRequired = (group: InputGroup) => enabledInputs.some((input) => input.group === group && input.required);

  const { handleSubmit, itemProps, setValue } = useForm<TreatmentFormModel>({
    async onSubmit(values) {
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: "Submitting treatment...",
      });

      try {
        const config = getTreatmentConfig();

        const formDataWithEventType = { ...values, eventType };

        // handle combo bolus insulin calculation edge case
        if (hasInput(InputGroup.COMBO_SPLIT) && values.insulin && values.splitNow) {
          const totalInsulin = parseFloat(values.insulin);
          const immediatePercent = parseFloat(values.splitNow);

          if (!isNaN(totalInsulin) && !isNaN(immediatePercent)) {
            // calculate actual immediate and extended insulin amounts
            const immediateInsulin = (totalInsulin * immediatePercent) / 100;
            const extendedInsulin = totalInsulin - immediateInsulin;

            formDataWithEventType.enteredinsulin = values.insulin;
            formDataWithEventType.insulin = immediateInsulin.toString();
            formDataWithEventType.relative = extendedInsulin.toString();
          }
        }

        const apiData = TreatmentFormConverter.toApiModel(formDataWithEventType);
        const result = await treatmentService.submitTreatments(config, [apiData]);

        if (result.success) {
          // cache last entered by name so they dont have to retype it next time
          if (values.enteredBy && values.enteredBy.trim() !== "") {
            cache.set(TREATMENTS_LAST_ENTERED_NAME_CACHE_KEY, values.enteredBy.trim());
          }
          await toast.hide();
          await showToast({
            style: Toast.Style.Success,
            title: "Treatment Added",
            message: "Treatment logged successfully",
          });
          popToRoot();
        }
      } catch (error) {
        // only handle unexpected errors here
        const isAppError = (err: unknown): err is AppError => {
          return typeof err === "object" && err !== null && "type" in err;
        };

        if (!isAppError(error)) {
          await handleAppError(
            {
              type: "connection",
              message: error instanceof Error ? error.message : "Unknown error occurred",
              instanceUrl: "unknown",
            },
            "treatment submission",
          );
        }
      }
    },
    validation: {
      eventTime: (value?: Date | null) => {
        if (!value) return "Event time is required";
        if (value > new Date()) return "Event time cannot be in the future";
      },
      glucose: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Blood Glucose", {
          min: 0,
          max: 1000,
          required: isRequired(InputGroup.GLUCOSE_MEASUREMENT),
        }),
      carbs: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Carbs", {
          min: 0,
          max: 1000,
          required: isRequired(InputGroup.MEAL_MACROS),
        }),
      insulin: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Insulin", {
          min: 0,
          max: 100,
          required: isRequired(InputGroup.INSULIN_GIVEN),
        }),
      duration: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Duration", {
          min: 0,
          max: 1440,
          required: isRequired(InputGroup.DURATION),
        }),
      percent: (value?: string, values?: TreatmentFormModel) => {
        // if temp basal is required, either percent OR absolute must be filled
        const tempBasalRequired = isRequired(InputGroup.TEMP_BASAL);
        const hasAbsolute = values?.absolute && values.absolute.trim() !== "";
        const hasPercent = value && value.trim() !== "";

        if (tempBasalRequired && !hasPercent && !hasAbsolute) {
          return "Either Percent Change or Absolute Rate is required";
        }

        return TreatmentFormConverter.validateNumericField(value, "Percent", {
          min: 0,
          max: 500,
          required: false,
        });
      },
      absolute: (value?: string, values?: TreatmentFormModel) => {
        // if temp basal is required, either percent OR absolute must be filled
        const tempBasalRequired = isRequired(InputGroup.TEMP_BASAL);
        const hasAbsolute = value && value.trim() !== "";
        const hasPercent = values?.percent && values.percent.trim() !== "";

        if (tempBasalRequired && !hasAbsolute && !hasPercent) {
          return "Either Percent Change or Absolute Rate is required";
        }

        return TreatmentFormConverter.validateNumericField(value, "Absolute Rate", {
          min: 0,
          max: 10,
          required: false,
        });
      },
      protein: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Protein", {
          min: 0,
          max: 1000,
          required: isRequired(InputGroup.MEAL_MACROS),
        }),
      fat: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Fat", {
          min: 0,
          max: 1000,
          required: isRequired(InputGroup.MEAL_MACROS),
        }),
      preBolus: (value?: string) =>
        TreatmentFormConverter.validateNumericField(value, "Carb Timing", {
          required: isRequired(InputGroup.CARB_TIMING),
        }),
      splitNow: (value?: string, values?: TreatmentFormModel) => {
        const numericValidation = TreatmentFormConverter.validateNumericField(value, "Immediate Insulin", {
          min: 0,
          max: 100,
          required: isRequired(InputGroup.COMBO_SPLIT),
        });

        if (numericValidation) return numericValidation;

        // check if combo split percentages sum to 100%
        if (hasInput(InputGroup.COMBO_SPLIT) && value && values?.splitExt) {
          const immediate = parseFloat(value);
          const extended = parseFloat(values.splitExt);
          if (!isNaN(immediate) && !isNaN(extended) && Math.abs(immediate + extended - 100) > 0.01) {
            return "Immediate and Extended insulin percentages must sum to 100%";
          }
        }

        return undefined;
      },
      splitExt: (value?: string, values?: TreatmentFormModel) => {
        const numericValidation = TreatmentFormConverter.validateNumericField(value, "Extended Insulin", {
          min: 0,
          max: 100,
          required: isRequired(InputGroup.COMBO_SPLIT),
        });

        if (numericValidation) return numericValidation;

        // check if combo split percentages sum to 100%
        if (hasInput(InputGroup.COMBO_SPLIT) && value && values?.splitNow) {
          const immediate = parseFloat(values.splitNow);
          const extended = parseFloat(value);
          if (!isNaN(immediate) && !isNaN(extended) && Math.abs(immediate + extended - 100) > 0.01) {
            return "Immediate and Extended insulin percentages must sum to 100%";
          }
        }

        return undefined;
      },
      glucoseType: (value?: string) =>
        TreatmentFormConverter.validateDropdownField(
          value,
          "Measurement Method",
          ["Finger", "Sensor"],
          isRequired(InputGroup.GLUCOSE_MEASUREMENT),
        ),
      profile: (value?: string) => {
        // get available profile names from loaded profiles
        const availableProfiles = profiles && profiles.length > 0 ? Object.keys(profiles[0].store) : ["Default"];

        return TreatmentFormConverter.validateDropdownField(
          value,
          "Profile",
          availableProfiles,
          isRequired(InputGroup.PROFILE_SWITCH),
        );
      },
    },
    initialValues: {
      eventTime: new Date(),
      enteredBy: cache.get(TREATMENTS_LAST_ENTERED_NAME_CACHE_KEY) || "",
      profile: selectedProfile,
    },
  });

  return (
    <Form
      navigationTitle={`Log ${eventType}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add Treatment" icon={Icon.Plus} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      {hasInput(InputGroup.GLUCOSE_MEASUREMENT) && (
        <>
          <Form.TextField
            title={`Blood Glucose${isRequired(InputGroup.GLUCOSE_MEASUREMENT) ? "*" : ""}`}
            placeholder="Measurement Value"
            info="Enter the blood glucose measurement value"
            {...itemProps.glucose}
          />
          <Form.Dropdown
            title={`Glucose Type${isRequired(InputGroup.GLUCOSE_MEASUREMENT) ? "*" : ""}`}
            info="Method used to measure glucose"
            {...itemProps.glucoseType}
          >
            <Form.Dropdown.Item value="Sensor" title="Sensor" />
            <Form.Dropdown.Item value="Finger" title="Finger" />
          </Form.Dropdown>
        </>
      )}

      {hasInput(InputGroup.MEAL_MACROS) && (
        <>
          <Form.TextField
            title={`Carbs (g)${isRequired(InputGroup.MEAL_MACROS) ? "*" : ""}`}
            placeholder="Carbohydrates in grams"
            info="Amount of carbohydrates consumed"
            {...itemProps.carbs}
          />
          <Form.TextField
            title={`Protein (g)${isRequired(InputGroup.MEAL_MACROS) ? "*" : ""}`}
            placeholder="Protein in grams"
            info="Amount of protein consumed"
            {...itemProps.protein}
          />
          <Form.TextField
            title={`Fat (g)${isRequired(InputGroup.MEAL_MACROS) ? "*" : ""}`}
            placeholder="Fat in grams"
            info="Amount of fat consumed"
            {...itemProps.fat}
          />
        </>
      )}

      {hasInput(InputGroup.INSULIN_GIVEN) && (
        <Form.TextField
          title={`Insulin (units)${isRequired(InputGroup.INSULIN_GIVEN) ? "*" : ""}`}
          placeholder="Insulin units given"
          info="Amount of insulin administered"
          {...itemProps.insulin}
        />
      )}

      {hasInput(InputGroup.COMBO_SPLIT) && (
        <>
          <Form.TextField
            title={`Immediate Insulin %${isRequired(InputGroup.COMBO_SPLIT) ? "*" : ""}`}
            placeholder="Percentage of insulin delivered immediately"
            info="Percentage of insulin delivered immediately in a combo bolus"
            {...itemProps.splitNow}
            onChange={(newValue) => {
              // update the immediate insulin percentage
              itemProps.splitNow.onChange?.(newValue);

              // calculate and update the extended percentage to make it sum to 100%
              const immediatePercent = parseFloat(newValue) || 0;
              if (immediatePercent >= 0 && immediatePercent <= 100) {
                const extendedPercent = 100 - immediatePercent;
                setValue("splitExt", extendedPercent.toString());
              }
            }}
          />
          <Form.TextField
            title={`Extended Insulin %${isRequired(InputGroup.COMBO_SPLIT) ? "*" : ""}`}
            placeholder="Percentage of insulin delivered over time"
            info="Percentage of insulin delivered over time in a combo bolus"
            {...itemProps.splitExt}
            onChange={(newValue) => {
              // update the extended insulin percentage
              itemProps.splitExt.onChange?.(newValue);

              // calculate and update the immediate percentage to make it sum to 100%
              const extendedPercent = parseFloat(newValue) || 0;
              if (extendedPercent >= 0 && extendedPercent <= 100) {
                const immediatePercent = 100 - extendedPercent;
                setValue("splitNow", immediatePercent.toString());
              }
            }}
          />
        </>
      )}

      {hasInput(InputGroup.DURATION) && (
        <Form.TextField
          title={`Duration (minutes)${isRequired(InputGroup.DURATION) ? "*" : ""}`}
          placeholder="Duration in minutes"
          info="Duration related to the treatment type"
          {...itemProps.duration}
        />
      )}

      {hasInput(InputGroup.CARB_TIMING) && (
        <Form.TextField
          title={`Carb Timing (minutes)${isRequired(InputGroup.CARB_TIMING) ? "*" : ""}`}
          placeholder="Minutes before/after meal, use negative values for before"
          info="Time before (-) or after (+) meal for food bolus"
          {...itemProps.preBolus}
        />
      )}

      {hasInput(InputGroup.TEMP_BASAL) && (
        <>
          <Form.TextField
            title={`Percent Change (%)${isRequired(InputGroup.TEMP_BASAL) ? "*" : ""}`}
            placeholder="Percentage change from basal"
            info="Percentage change in basal rate for temporary basal (will clear absolute rate)"
            {...itemProps.percent}
            onChange={(newValue) => {
              itemProps.percent.onChange?.(newValue);
              if (newValue && newValue.trim() !== "") {
                setValue("absolute", "");
              }
            }}
          />
          <Form.TextField
            title={`Absolute Rate (units/hr)${isRequired(InputGroup.TEMP_BASAL) ? "*" : ""}`}
            placeholder="Exact basal rate"
            info="Exact basal rate instead of percentage change (will clear percent change)"
            {...itemProps.absolute}
            onChange={(newValue) => {
              itemProps.absolute.onChange?.(newValue);
              if (newValue && newValue.trim() !== "") {
                setValue("percent", "");
              }
            }}
          />
        </>
      )}

      {hasInput(InputGroup.SENSOR_CHANGE) && (
        <>
          <Form.TextField
            title={`Transmitter ID${isRequired(InputGroup.SENSOR_CHANGE) ? "*" : ""}`}
            placeholder="Transmitter identifier"
            info="ID of the glucose transmitter"
            {...itemProps.transmitterId}
          />
          <Form.TextField
            title={`Sensor Code${isRequired(InputGroup.SENSOR_CHANGE) ? "*" : ""}`}
            placeholder="Sensor start code"
            info="Dexcom G6 sensor start code"
            {...itemProps.sensorCode}
          />
        </>
      )}

      {isProfilesLoaded && (
        <Form.Dropdown
          title={`Profile${isRequired(InputGroup.PROFILE_SWITCH) ? "*" : ""}`}
          info="Select the insulin profile to switch to"
          {...itemProps.profile}
          value={selectedProfile}
          onChange={setSelectedProfile}
        >
          {dropdownItems.map((profileName) => (
            <Form.Dropdown.Item
              key={profileName}
              value={profileName}
              title={profileName === profiles?.[0]?.defaultProfile ? `${profileName} (default)` : profileName}
            />
          ))}
        </Form.Dropdown>
      )}

      {hasInput(InputGroup.NOTES) && (
        <Form.TextArea
          title={`Notes${isRequired(InputGroup.NOTES) ? "*" : ""}`}
          placeholder="Any additional notes about this treatment..."
          {...itemProps.notes}
        />
      )}

      {hasInput(InputGroup.ENTERED_BY) && (
        <Form.TextField
          title={`Entered By${isRequired(InputGroup.ENTERED_BY) ? "*" : ""}`}
          placeholder="Who entered this data"
          info="Person or system that entered this treatment"
          {...itemProps.enteredBy}
        />
      )}

      {hasInput(InputGroup.EVENT_TIME) && (
        <Form.DatePicker
          title={`Event Time${isRequired(InputGroup.EVENT_TIME) ? "*" : ""}`}
          info="When this treatment occurred"
          {...itemProps.eventTime}
        />
      )}
    </Form>
  );
}

const commonInputs = [
  { group: InputGroup.NOTES, required: false },
  { group: InputGroup.ENTERED_BY, required: false },
  { group: InputGroup.EVENT_TIME, required: true },
];

/** pre-configured form components for specific treatment types **/

export function BloodGlucoseForm() {
  return (
    <TreatmentFormBase
      eventType="BG Check"
      enabledInputs={[{ group: InputGroup.GLUCOSE_MEASUREMENT, required: true }, ...commonInputs]}
    />
  );
}

export function SnackBolusForm() {
  return (
    <TreatmentFormBase
      eventType="Snack Bolus"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.MEAL_MACROS, required: false },
        { group: InputGroup.INSULIN_GIVEN, required: true },
        { group: InputGroup.CARB_TIMING, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function MealBolusForm() {
  return (
    <TreatmentFormBase
      eventType="Meal Bolus"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.MEAL_MACROS, required: false },
        { group: InputGroup.INSULIN_GIVEN, required: true },
        { group: InputGroup.CARB_TIMING, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function CarbCorrectionForm() {
  return (
    <TreatmentFormBase
      eventType="Carb Correction"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.MEAL_MACROS, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function CorrectionBolusForm() {
  return (
    <TreatmentFormBase
      eventType="Correction Bolus"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.INSULIN_GIVEN, required: true },
        ...commonInputs,
      ]}
    />
  );
}

export function ComboBolusForm() {
  return (
    <TreatmentFormBase
      eventType="Combo Bolus"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.MEAL_MACROS, required: false },
        { group: InputGroup.INSULIN_GIVEN, required: true },
        { group: InputGroup.COMBO_SPLIT, required: true },
        { group: InputGroup.DURATION, required: false },
        { group: InputGroup.CARB_TIMING, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function AnnouncementForm() {
  return (
    <TreatmentFormBase
      eventType="Announcement"
      enabledInputs={[{ group: InputGroup.NOTES, required: true }, ...commonInputs]}
    />
  );
}

export function NoteForm() {
  return (
    <TreatmentFormBase
      eventType="Note"
      enabledInputs={[
        { group: InputGroup.DURATION, required: false },
        { group: InputGroup.NOTES, required: true },
        ...commonInputs,
      ]}
    />
  );
}

export function QuestionForm() {
  return (
    <TreatmentFormBase
      eventType="Question"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.NOTES, required: true },
        ...commonInputs,
      ]}
    />
  );
}

export function ExerciseForm() {
  return (
    <TreatmentFormBase
      eventType="Exercise"
      enabledInputs={[{ group: InputGroup.DURATION, required: false }, ...commonInputs]}
    />
  );
}

export function PumpSiteChangeForm() {
  return (
    <TreatmentFormBase
      eventType="Pump Site Change"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.INSULIN_GIVEN, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function CGMSensorStartForm() {
  return (
    <TreatmentFormBase
      eventType="CGM Sensor Start"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.SENSOR_CHANGE, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function CGMSensorInsertForm() {
  return (
    <TreatmentFormBase
      eventType="CGM Sensor Insert"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.SENSOR_CHANGE, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function CGMSensorStopForm() {
  return (
    <TreatmentFormBase
      eventType="CGM Sensor Stop"
      enabledInputs={[{ group: InputGroup.GLUCOSE_MEASUREMENT, required: false }, ...commonInputs]}
    />
  );
}

export function PumpBatteryChangeForm() {
  return (
    <TreatmentFormBase
      eventType="Pump Battery Change"
      enabledInputs={[{ group: InputGroup.GLUCOSE_MEASUREMENT, required: false }, ...commonInputs]}
    />
  );
}

export function InsulinCartridgeChangeForm() {
  return (
    <TreatmentFormBase
      eventType="Insulin Cartridge Change"
      enabledInputs={[{ group: InputGroup.GLUCOSE_MEASUREMENT, required: false }, ...commonInputs]}
    />
  );
}

export function TempBasalStartForm() {
  return (
    <TreatmentFormBase
      eventType="Temp Basal Start"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.DURATION, required: false },
        { group: InputGroup.TEMP_BASAL, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function TempBasalEndForm() {
  return (
    <TreatmentFormBase
      eventType="Temp Basal End"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.DURATION, required: false },
        ...commonInputs,
      ]}
    />
  );
}

export function ProfileSwitchForm({ profileName }: { profileName?: string }) {
  return (
    <TreatmentFormBase
      eventType="Profile Switch"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.PROFILE_SWITCH, required: true },
        { group: InputGroup.DURATION, required: false },
        ...commonInputs,
      ]}
      profileName={profileName}
    />
  );
}

export function DiabeticAlertDogAlertForm() {
  return (
    <TreatmentFormBase
      eventType="D.A.D. Alert"
      enabledInputs={[
        { group: InputGroup.GLUCOSE_MEASUREMENT, required: false },
        { group: InputGroup.NOTES, required: true },
        ...commonInputs,
      ]}
    />
  );
}

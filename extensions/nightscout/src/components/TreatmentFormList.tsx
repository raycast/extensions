import { Action, ActionPanel, List } from "@raycast/api";
import {
  AnnouncementForm,
  BloodGlucoseForm,
  CarbCorrectionForm,
  CGMSensorInsertForm,
  CGMSensorStartForm,
  CGMSensorStopForm,
  ComboBolusForm,
  CorrectionBolusForm,
  DiabeticAlertDogAlertForm,
  ExerciseForm,
  InsulinCartridgeChangeForm,
  MealBolusForm,
  NoteForm,
  ProfileSwitchForm,
  PumpBatteryChangeForm,
  PumpSiteChangeForm,
  QuestionForm,
  SnackBolusForm,
  TempBasalStartForm,
  TempBasalEndForm,
} from "./TreatmentForm";
import { treatmentIconMap } from "../utils/treatmentIcons";

export function TreatmentFormList() {
  const formMap = {
    "Blood Glucose Check": {
      icon: treatmentIconMap["Blood Glucose Check"],
      form: <BloodGlucoseForm />,
      subtitle: "Log a manual blood glucose reading",
    },
    "Snack Bolus": {
      icon: treatmentIconMap["Snack Bolus"],
      form: <SnackBolusForm />,
      subtitle: "Log a meal or snack with accompanying insulin as appropriate",
    },
    "Meal Bolus": {
      icon: treatmentIconMap["Meal Bolus"],
      form: <MealBolusForm />,
      subtitle: "Log a meal or snack with accompanying insulin as appropriate",
    },
    "Carb Correction": {
      icon: treatmentIconMap["Carb Correction"],
      form: <CarbCorrectionForm />,
      subtitle: "Log carbohydrate intake without insulin for correcting a low",
    },
    "Correction Bolus": {
      icon: treatmentIconMap["Correction Bolus"],
      form: <CorrectionBolusForm />,
      subtitle: "Log a correction bolus for high blood sugar",
    },
    "Combo Bolus": {
      icon: treatmentIconMap["Combo Bolus"],
      form: <ComboBolusForm />,
      subtitle: "Log a combo bolus for a meal with some insulin up front and some over time",
    },
    Announcement: {
      icon: treatmentIconMap["Announcement"],
      form: <AnnouncementForm />,
      subtitle: "Log an announcement to be displayed and acknowledged by Nightscout users",
    },
    Note: {
      icon: treatmentIconMap["Note"],
      form: <NoteForm />,
      subtitle: "Log a note or observation related to diabetes management",
    },
    Question: {
      icon: treatmentIconMap["Question"],
      form: <QuestionForm />,
      subtitle: "Log a question related to diabetes management",
    },
    Exercise: {
      icon: treatmentIconMap["Exercise"],
      form: <ExerciseForm />,
      subtitle: "Log physical activity or exercise",
    },
    "Pump Site Change": {
      icon: treatmentIconMap["Pump Site Change"],
      form: <PumpSiteChangeForm />,
      subtitle: "Log a change of the insulin pump site",
    },
    "Pump Battery Change": {
      icon: treatmentIconMap["Pump Battery Change"],
      form: <PumpBatteryChangeForm />,
      subtitle: "Log a change of the insulin pump battery",
    },
    "CGM Sensor Insert": {
      icon: treatmentIconMap["CGM Sensor Insert"],
      form: <CGMSensorInsertForm />,
      subtitle: "Log the insertion of a new CGM sensor (before it is started/active)",
    },
    "CGM Sensor Start": {
      icon: treatmentIconMap["CGM Sensor Start"],
      form: <CGMSensorStartForm />,
      subtitle: "Log the start of a CGM sensor session",
    },
    "CGM Sensor Stop": {
      icon: treatmentIconMap["CGM Sensor Stop"],
      form: <CGMSensorStopForm />,
      subtitle: "Log the end of the current CGM sensor session",
    },
    "Insulin Cartridge Change": {
      icon: treatmentIconMap["Insulin Cartridge Change"],
      form: <InsulinCartridgeChangeForm />,
      subtitle: "Log a change of the insulin cartridge",
    },
    "Temp Basal Start": {
      icon: treatmentIconMap["Temp Basal Start"],
      form: <TempBasalStartForm />,
      subtitle: "Log the start of a temporary basal rate",
    },
    "Temp Basal End": {
      icon: treatmentIconMap["Temp Basal End"],
      form: <TempBasalEndForm />,
      subtitle: "Log the end of the temporary basal rate",
    },
    "Profile Switch": {
      icon: treatmentIconMap["Profile Switch"],
      form: <ProfileSwitchForm />,
      subtitle: "Log a switch between different insulin profiles (this also switches for you)",
    },
    "D.A.D. Alert": {
      icon: treatmentIconMap["D.A.D. Alert"],
      form: <DiabeticAlertDogAlertForm />,
      subtitle: "Log an event related to a diabetic alert dog",
    },
  };

  return (
    <List searchBarPlaceholder="Select treatment type to add">
      {Object.entries(formMap).map(([title, { icon, form, subtitle }]) => (
        <List.Item
          key={title}
          title={title}
          subtitle={subtitle}
          icon={icon}
          actions={
            <ActionPanel>
              <Action.Push title={`Add ${title}`} icon={icon} target={form} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

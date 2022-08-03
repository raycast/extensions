import { List, Icon, Color, ActionPanel, Action } from "@raycast/api";
import { ActivityModel, ProgramType } from "../interface/ActivityModel";

export const activityListItem = (activity: ActivityModel) => {
  return (
    <List.Item
      key={`${activity.Title} ${activity.Barcode}`}
      icon={{
        source: activity.MaxRegistrants <= activity.NumRegistered ? Icon.Warning : Icon.Checkmark,
        tintColor: activity.MaxRegistrants <= activity.NumRegistered ? Color.Red : Color.Green,
      }}
      title={activity.Title.replace("&#8776", "")}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Register"
            url={`https://www1.city.mississauga.on.ca/connect2rec/Activities/ActivitiesCourseDetails.asp?cid=${activity.Id}`}
          />
          <Action.CopyToClipboard title="Copy Barcode" content={`${activity.Barcode}`} />
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Title" content={`${activity.Title}`} />

            {activity.LocationAddress && activity.LocationAddress.length > 0 && (
              <Action.CopyToClipboard title="Copy Location" content={`${activity.LocationAddress ?? ""}`} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title={activity.Title.replace("&#8776", "")} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Program Type" />
              <List.Item.Detail.Metadata.Label
                title={activity.ProgramType.trim()}
                icon={programTypeToIcon(activity.ProgramType)}
              />
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title={"Location"} />
              <List.Item.Detail.Metadata.Label
                title={activity.LocationAddress ?? "Online"}
                icon={{ source: Icon.Pin, tintColor: Color.Green }}
              />

              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Barcode" />
              <List.Item.Detail.Metadata.Label title={activity.Barcode.trim()} icon={Icon.BarCode} />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Cost" />
              <List.Item.Detail.Metadata.Label
                title={`$${activity.Amount} CAD`}
                icon={{ source: activity.Amount <= 0 ? Icon.Checkmark : Icon.Coins, tintColor: Color.Green }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`Start Date: ${activity.FriendlyStartTime}`}
                icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
              />
              <List.Item.Detail.Metadata.Label
                title={`End Date: ${activity.FriendlyEndMonth}, ${activity.FriendlyEndDate}`}
                icon={{ source: Icon.Calendar, tintColor: Color.Purple }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`Length: ${activity.FriendlyLength}`}
                icon={{ source: Icon.Clock, tintColor: Color.Orange }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={`Max Registrants: ${activity.MaxRegistrants}`}
                icon={{ source: Icon.AddPerson, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Label
                title={`Number Registered: ${activity.NumRegistered}`}
                icon={{ source: Icon.Person, tintColor: Color.Blue }}
              />
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={activity.MaxRegistrants <= activity.NumRegistered ? "Activity Full" : "Open for Registrants"}
                icon={{
                  source: activity.MaxRegistrants <= activity.NumRegistered ? Icon.Warning : Icon.Checkmark,
                  tintColor: activity.MaxRegistrants <= activity.NumRegistered ? Color.Red : Color.Green,
                }}
              />
              <List.Item.Detail.Metadata.Separator />

              <List.Item.Detail.Metadata.Label title={`Number of classes: ${activity.NumberOfClasses ?? 0}`} />
              <List.Item.Detail.Metadata.Separator />
            </List.Item.Detail.Metadata>
          }
        />
      }
    ></List.Item>
  );
};

export const programTypeToIcon = (programType: ProgramType) => {
  switch (programType) {
    case ProgramType.BooksReading:
      return Icon.Book;
    case ProgramType.CampsFullDay:
      return Icon.House;
    case ProgramType.CampsHalfDay:
      return Icon.House;
    case ProgramType.DanceDramaMusic:
      return Icon.Music;
    case ProgramType.Fitness:
      return Icon.Weights;
    case ProgramType.JobsCareers:
      return Icon.PersonCircle;
    case ProgramType.Learning:
      return Icon.Bookmark;
    case ProgramType.LifeSavingSkills:
      return Icon.WrenchScrewdriver;
    case ProgramType.MakerMississauga:
      return Icon.Gear;
    case ProgramType.SkatingHockey:
      return Icon.Person;
    case ProgramType.SocialActivities:
      return Icon.AddPerson;
    case ProgramType.SportLeagues:
      return Icon.TennisBall;
    case ProgramType.Sports:
      return Icon.AmericanFootball;
    case ProgramType.SwimmingLessons:
      return Icon.EyeDropper;
    case ProgramType.Therapeutic:
      return Icon.Sunrise;
    case ProgramType.WaterExercise:
      return Icon.QuestionMarkCircle;
  }
};

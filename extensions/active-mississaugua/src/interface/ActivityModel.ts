export interface ActivityModel {
  ActivityId: number;
  FilterId: number;
  ActivityTypeId: number;
  ProgramId: number;
  ProgramType: ProgramType;
  MinAge: number;
  MaxAge: number;
  MinAgeType: string;
  MaxAgeType: string;
  SubProgramType: SubProgramType;
  Title: string;
  Description: string;
  Barcode: string;
  FacilityName: string;
  LocationId: number;
  LocationName: string | null;
  LocationAddress: string | null;
  NumberOfClasses: number;
  StartDate: Date;
  EndDate: Date;
  FriendlyStartTime: string;
  FriendlyStartTime_ForSorting: string;
  FriendlyStartDate: string;
  FriendlyEndDate: string;
  SeasonString: string;
  FriendlyLength: string;
  FriendlyStartMonth: string;
  FriendlyEndMonth: string;
  FriendlyDaysOfWeek: string;
  Amount: number;
  NumRegistered: number;
  MaxRegistrants: number;
  BookmarkedDate: Date;
  ExclusionDates: string;
  InclusionDates: null | string;
  Id: number;
}

export enum ProgramType {
  BooksReading = "Books & Reading                         ",
  CampsFullDay = "Camps - Full Day                        ",
  CampsHalfDay = "Camps - Half Day                        ",
  DanceDramaMusic = "Dance, Drama, Music                     ",
  Fitness = "Fitness                                 ",
  JobsCareers = "Jobs & Careers                          ",
  Learning = "Learning                                ",
  LifeSavingSkills = "Life Saving Skills                      ",
  MakerMississauga = "Maker Mississauga                       ",
  SkatingHockey = "Skating & Hockey                        ",
  SocialActivities = "Social Activities                       ",
  SportLeagues = "Sport Leagues                           ",
  Sports = "Sports                                  ",
  SwimmingLessons = "Swimming Lessons                        ",
  Therapeutic = "Therapeutic                             ",
  WaterExercise = "Water Exercise                          ",
}

export enum SubProgramType {
  Adult = "Adult",
  Arts = "Arts",
  DanceDramaMusic = "Dance, Drama, Music",
  Family = "Family",
  Learning = "Learning",
  OlderAdult = "Older Adult",
  Preschool = "Preschool",
  Sports = "Sports",
  Youth = "Youth",
}

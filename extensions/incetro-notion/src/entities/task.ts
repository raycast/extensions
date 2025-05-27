export interface Task {
  id: string;
  title: string;
  status: string;
  estimate: number;
}

export interface NewTaskMsg {
  projectID: string;
  executorID: string;
  task: string;
  estimate: number;
  priority: TaskPriority;
  start: Date;
  end: Date;
}

export const enum TaskStatus {
  Forming = "Формируется",
  CanDo = "Можно делать",
  OnHold = "На паузе",
  Waiting = "Ожидание",
  InProgress = "В работе",
  NeedDiscuss = "Надо обсудить",
  CodeReview = "Код-ревью",
  InternalCheck = "Внутренняя проверка",
  ReadyToUpload = "Можно выгружать",
  ClientCheck = "Проверка клиентом",
  Cancelled = "Отменена",
  Done = "Готова",
}

export const enum TaskPriority {
  Low = "Низкий",
  Medium = "Средний",
  High = "Высокий",
  Critical = "Критический",
}

import axios from "axios";
import type { AttendanceResponse, LoginRequest } from "../types";

const COOKIE_KEY = "Tita_PC";

/**
 * 登录并获取 Cookie
 */
export async function login(phone: string, encryptedPassword: string): Promise<string | null> {
  const url = "https://www.italent.cn/Account/Login";
  const data: LoginRequest = {
    UseLoginGeetest: false,
    Remember: "",
    Domin: "",
    ReturnUrl: "https://www.italent.cn/portal/iTalentHome/",
    UseLoginMutex: false,
    MutexToken: "",
    LoginType: 0,
    UserName: phone,
    Password: encryptedPassword,
    lt: "zh_CN",
  };

  try {
    const response = await axios.post(url, JSON.stringify(data), {
      withCredentials: true,
      headers: { "Content-Type": "application/json" },
    });

    const cookies = response.headers["set-cookie"];
    if (!cookies || cookies.length === 0) {
      console.error("登录失败：未获取到 Cookie");
      return null;
    }

    // 提取 cookie 值
    const cookie = cookies[0].split(";")[0]!.split("=")[1]!;
    return cookie;
  } catch (error) {
    console.error("登录失败：", error);
    throw error;
  }
}

/**
 * 获取考勤数据
 */
export async function fetchAttendanceData(
  uid: string,
  userText: string,
  period: string,
  cookie: string,
): Promise<AttendanceResponse> {
  const url =
    "https://cloud.italent.cn/api/v2/UI/TableList?viewName=Attendance.SingleObjectListView.EmpAttendanceDataList&metaObjName=Attendance.AttendanceStatistics&app=Attendance&PaaS-SourceApp=Attendance&PaaS-CurrentView=Attendance.AttendanceDataRecordNavView&shadow_context=%7B%22appModel%22%3A%22italent%22%2C%22uppid%22%3A%221%22%7D";

  const requestData = buildAttendanceRequest(uid, userText, period);

  try {
    const response = await axios.post(url, JSON.stringify(requestData), {
      headers: {
        "Content-Type": "application/json",
        Cookie: `${COOKIE_KEY}=${cookie}`,
      },
    });

    return response.data;
  } catch (error) {
    console.error("获取考勤数据失败：", error);
    throw error;
  }
}

/**
 * 构建考勤数据请求体
 */
function buildAttendanceRequest(uid: string, userText: string, period: string) {
  return {
    table_data: {
      advance: {
        cmp_render: {
          viewPath: "MyAttendanceStatisticsTable",
          status: "enable",
        },
      },
      hasCheckColumn: true,
      ext_data: {
        ListViewLabel: "我的考勤列表",
      },
      isEnableGlobleCheck: false,
      hasRowHandler: true,
      paging: {
        total: 0,
        capacity: 100,
        page: 0,
        capacityList: [15, 30, 60, 100],
      },
      isAvatars: false,
      viewName: "Attendance.SingleObjectListView.EmpAttendanceDataList",
      operateColumWidth: 140,
      extendsParam: "",
      isSyncRowHandler: true,
      isFrozenOperationColumnHandler: false,
      isCustomListViewExisted: false,
      getTreeNodeUrl: null,
      sort_fields: [
        {
          sort_column: "SwipingCardDate",
          sort_dir: "asc",
        },
      ],
      description: "员工出勤列表",
      metaObjName: "Attendance.AttendanceStatistics",
      isCustomListView: false,
      navViewIsCustom: false,
      navViewName: "Attendance.AttendanceDataRecordNavView",
      navViewVersion: "0",
    },
    search_data: {
      metaObjName: "Attendance.AttendanceStatistics",
      searchView: "Attendance.EmpAttendanceDataSearch",
      items: [
        {
          name: "Attendance.AttendanceStatistics.StaffId",
          text: userText,
          value: uid,
          num: "1",
          metaObjName: "",
          metaFieldRelationIDPath: "",
          queryAreaSubNodes: false,
        },
        {
          name: "Attendance.AttendanceStatistics.StdIsDeleted",
          text: "否",
          value: "0",
          num: "6",
          metaObjName: "",
          metaFieldRelationIDPath: "",
          queryAreaSubNodes: false,
        },
        {
          name: "Attendance.AttendanceStatistics.Status",
          text: "启用",
          value: "1",
          num: "7",
          metaObjName: "",
          metaFieldRelationIDPath: "",
          queryAreaSubNodes: false,
        },
        {
          name: "Attendance.AttendanceStatistics.SwipingCardDate",
          text: period,
          value: period,
          num: "",
          metaObjName: "",
          metaFieldRelationIDPath: "",
          queryAreaSubNodes: false,
        },
      ],
      searchFormFilterJson: null,
    },
  };
}

import { Component } from "react";
import { Detail } from "@raycast/api";
import ErrorActions from "./ErrorActions";

export default class ErrorMessage extends Component<any, any> {
  render() {
    return <Detail markdown={this.props.message} actions={<ErrorActions />} />;
  }
}

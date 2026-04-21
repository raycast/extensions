type Typography = {
  fontFamily: string;
  fontSize: string;
  fontWeight: number;
  lineHeight: string;
  letterSpacing: string;
};
type Button = {
  backgroundColor: string;
  color: string;
  borderColor: string;
  borderRadius: string;
  borderWidth: string;
  borderStyle: string;
  padding: string;
  fontSize: string;
  fontWeight: number;
  textDecoration: string;
  boxShadow: string;
};

export type Styleguide = {
  mode: "light" | "dark";
  colors: {
    accent: string;
    background: string;
    text: string;
  };
  typography: {
    headings: {
      h1: Typography;
      h2: Typography;
      h3: Typography;
      h4: Typography;
    };
    p: Typography;
  };
  elementSpacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    inner: string;
  };
  components: {
    button: {
      primary: Button;
      secondary: Button;
      link: Button;
    };
    card: {
      backgroundColor: string;
      borderColor: string;
      borderRadius: string;
      borderWidth: string;
      borderStyle: string;
      padding: string;
      boxShadow: string;
      textColor: string;
    };
  };
};

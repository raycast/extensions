```fortran
subroutine srotm (
        integer n,
        real, dimension(*) sx,
        integer incx,
        real, dimension(*) sy,
        integer incy,
        real, dimension(5) sparam
)
```

APPLY THE MODIFIED GIVENS TRANSFORMATION, H, TO THE 2 BY N MATRIX

(SX\*\*T) , WHERE \*\*T INDICATES TRANSPOSE. THE ELEMENTS OF SX ARE IN
(SX\*\*T)

SX(LX+I\*INCX), I = 0 TO N-1, WHERE LX = 1 IF INCX .GE. 0, ELSE
LX = (-INCX)\*N, AND SIMILARLY FOR SY USING USING LY AND INCY.
WITH SPARAM(1)=SFLAG, H HAS ONE OF THE FOLLOWING FORMS..

SFLAG=-1.E0     SFLAG=0.E0        SFLAG=1.E0     SFLAG=-2.E0

(SH11  SH12)    (1.E0  SH12)    (SH11  1.E0)    (1.E0  0.E0)
H=(          )    (          )    (          )    (          )
(SH21  SH22),   (SH21  1.E0),   (-1.E0 SH22),   (0.E0  1.E0).
SEE  SROTMG FOR A DESCRIPTION OF DATA STORAGE IN SPARAM.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

SX : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of SX

SY : REAL array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of SY

SPARAM : REAL array, dimension (5) [in]
> SPARAM(1)=SFLAG
> SPARAM(2)=SH11
> SPARAM(3)=SH21
> SPARAM(4)=SH12
> SPARAM(5)=SH22

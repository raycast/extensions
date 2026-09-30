```fortran
subroutine drotm (
        integer n,
        double precision, dimension(*) dx,
        integer incx,
        double precision, dimension(*) dy,
        integer incy,
        double precision, dimension(5) dparam
)
```

APPLY THE MODIFIED GIVENS TRANSFORMATION, H, TO THE 2 BY N MATRIX

(DX\*\*T) , WHERE \*\*T INDICATES TRANSPOSE. THE ELEMENTS OF DX ARE IN
(DY\*\*T)

DX(LX+I\*INCX), I = 0 TO N-1, WHERE LX = 1 IF INCX .GE. 0, ELSE
LX = (-INCX)\*N, AND SIMILARLY FOR SY USING LY AND INCY.
WITH DPARAM(1)=DFLAG, H HAS ONE OF THE FOLLOWING FORMS..

DFLAG=-1.D0     DFLAG=0.D0        DFLAG=1.D0     DFLAG=-2.D0

(DH11  DH12)    (1.D0  DH12)    (DH11  1.D0)    (1.D0  0.D0)
H=(          )    (          )    (          )    (          )
(DH21  DH22),   (DH21  1.D0),   (-1.D0 DH22),   (0.D0  1.D0).
SEE DROTMG FOR A DESCRIPTION OF DATA STORAGE IN DPARAM.

## Parameters
N : INTEGER [in]
> number of elements in input vector(s)

DX : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCX ) ) [in,out]

INCX : INTEGER [in]
> storage spacing between elements of DX

DY : DOUBLE PRECISION array, dimension ( 1 + ( N - 1 )\*abs( INCY ) ) [in,out]

INCY : INTEGER [in]
> storage spacing between elements of DY

DPARAM : DOUBLE PRECISION array, dimension (5) [in]
> DPARAM(1)=DFLAG
> DPARAM(2)=DH11
> DPARAM(3)=DH21
> DPARAM(4)=DH12
> DPARAM(5)=DH22

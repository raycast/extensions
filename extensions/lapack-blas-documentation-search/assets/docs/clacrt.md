```fortran
subroutine clacrt (
        integer n,
        complex, dimension( * ) cx,
        integer incx,
        complex, dimension( * ) cy,
        integer incy,
        complex c,
        complex s
)
```

CLACRT performs the operation

(  c  s )( x )  ==> ( x )
( -s  c )( y )      ( y )

where c and s are complex and the vectors x and y are complex.

## Parameters
N : INTEGER [in]
> The number of elements in the vectors CX and CY.

CX : COMPLEX array, dimension (N) [in,out]
> On input, the vector x.
> On output, CX is overwritten with c\*x + s\*y.

INCX : INTEGER [in]
> The increment between successive values of CX.  INCX <> 0.

CY : COMPLEX array, dimension (N) [in,out]
> On input, the vector y.
> On output, CY is overwritten with -s\*x + c\*y.

INCY : INTEGER [in]
> The increment between successive values of CY.  INCY <> 0.

C : COMPLEX [in]

S : COMPLEX [in]
> C and S define the matrix
> [  C   S  ].
> [ -S   C  ]

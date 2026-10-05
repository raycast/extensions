```fortran
subroutine zlartv (
        integer n,
        complex*16, dimension( * ) x,
        integer incx,
        complex*16, dimension( * ) y,
        integer incy,
        double precision, dimension( * ) c,
        complex*16, dimension( * ) s,
        integer incc
)
```

ZLARTV applies a vector of complex plane rotations with real cosines
to elements of the complex vectors x and y. For i = 1,2,...,n

( x(i) ) := (        c(i)   s(i) ) ( x(i) )
( y(i) )    ( -conjg(s(i))  c(i) ) ( y(i) )

## Parameters
N : INTEGER [in]
> The number of plane rotations to be applied.

X : COMPLEX\*16 array, dimension (1+(N-1)\*INCX) [in,out]
> The vector x.

INCX : INTEGER [in]
> The increment between elements of X. INCX > 0.

Y : COMPLEX\*16 array, dimension (1+(N-1)\*INCY) [in,out]
> The vector y.

INCY : INTEGER [in]
> The increment between elements of Y. INCY > 0.

C : DOUBLE PRECISION array, dimension (1+(N-1)\*INCC) [in]
> The cosines of the plane rotations.

S : COMPLEX\*16 array, dimension (1+(N-1)\*INCC) [in]
> The sines of the plane rotations.

INCC : INTEGER [in]
> The increment between elements of C and S. INCC > 0.

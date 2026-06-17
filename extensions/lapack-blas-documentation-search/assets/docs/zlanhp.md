```fortran
double precision function zlanhp (
        character norm,
        character uplo,
        integer n,
        complex*16, dimension( * ) ap,
        double precision, dimension( * ) work
)
```

ZLANHP  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the  element of  largest absolute value  of a
complex hermitian matrix A,  supplied in packed form.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in ZLANHP as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> hermitian matrix A is supplied.
> = 'U':  Upper triangular part of A is supplied
> = 'L':  Lower triangular part of A is supplied

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, ZLANHP is
> set to zero.

AP : COMPLEX\*16 array, dimension (N\*(N+1)/2) [in]
> The upper or lower triangle of the hermitian matrix A, packed
> columnwise in a linear array.  The j-th column of A is stored
> in the array AP as follows:
> if UPLO = 'U', AP(i + (j-1)\*j/2) = A(i,j) for 1<=i<=j;
> if UPLO = 'L', AP(i + (j-1)\*(2n-j)/2) = A(i,j) for j<=i<=n.
> Note that the  imaginary parts of the diagonal elements need
> not be set and are assumed to be zero.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I' or '1' or 'O'; otherwise,
> WORK is not referenced.

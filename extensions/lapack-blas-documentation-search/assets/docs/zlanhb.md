```fortran
double precision function zlanhb (
        character norm,
        character uplo,
        integer n,
        integer k,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( * ) work
)
```

ZLANHB  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the element of  largest absolute value  of an
n by n hermitian band matrix A,  with k super-diagonals.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in ZLANHB as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> band matrix A is supplied.
> = 'U':  Upper triangular
> = 'L':  Lower triangular

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, ZLANHB is
> set to zero.

K : INTEGER [in]
> The number of super-diagonals or sub-diagonals of the
> band matrix A.  K >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in]
> The upper or lower triangle of the hermitian band matrix A,
> stored in the first K+1 rows of AB.  The j-th column of A is
> stored in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(k+1+i-j,j) = A(i,j) for max(1,j-k)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)   = A(i,j) for j<=i<=min(n,j+k).
> Note that the imaginary parts of the diagonal elements need
> not be set and are assumed to be zero.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= K+1.

WORK : DOUBLE PRECISION array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I' or '1' or 'O'; otherwise,
> WORK is not referenced.

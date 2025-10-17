```fortran
real function clansb (
        character norm,
        character uplo,
        integer n,
        integer k,
        complex, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( * ) work
)
```

CLANSB  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the element of  largest absolute value  of an
n by n symmetric band matrix A,  with k super-diagonals.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in CLANSB as described
> above.

UPLO : CHARACTER\*1 [in]
> Specifies whether the upper or lower triangular part of the
> band matrix A is supplied.
> = 'U':  Upper triangular part is supplied
> = 'L':  Lower triangular part is supplied

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, CLANSB is
> set to zero.

K : INTEGER [in]
> The number of super-diagonals or sub-diagonals of the
> band matrix A.  K >= 0.

AB : COMPLEX array, dimension (LDAB,N) [in]
> The upper or lower triangle of the symmetric band matrix A,
> stored in the first K+1 rows of AB.  The j-th column of A is
> stored in the j-th column of the array AB as follows:
> if UPLO = 'U', AB(k+1+i-j,j) = A(i,j) for max(1,j-k)<=i<=j;
> if UPLO = 'L', AB(1+i-j,j)   = A(i,j) for j<=i<=min(n,j+k).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= K+1.

WORK : REAL array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I' or '1' or 'O'; otherwise,
> WORK is not referenced.

```fortran
real function slangb (
        character norm,
        integer n,
        integer kl,
        integer ku,
        real, dimension( ldab, * ) ab,
        integer ldab,
        real, dimension( * ) work
)
```

SLANGB  returns the value of the one norm,  or the Frobenius norm, or
the  infinity norm,  or the element of  largest absolute value  of an
n by n band matrix  A,  with kl sub-diagonals and ku super-diagonals.

## Parameters
NORM : CHARACTER\*1 [in]
> Specifies the value to be returned in SLANGB as described
> above.

N : INTEGER [in]
> The order of the matrix A.  N >= 0.  When N = 0, SLANGB is
> set to zero.

KL : INTEGER [in]
> The number of sub-diagonals of the matrix A.  KL >= 0.

KU : INTEGER [in]
> The number of super-diagonals of the matrix A.  KU >= 0.

AB : REAL array, dimension (LDAB,N) [in]
> The band matrix A, stored in rows 1 to KL+KU+1.  The j-th
> column of A is stored in the j-th column of the array AB as
> follows:
> AB(ku+1+i-j,j) = A(i,j) for max(1,j-ku)<=i<=min(n,j+kl).

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDAB >= KL+KU+1.

WORK : REAL array, dimension (MAX(1,LWORK)), [out]
> where LWORK >= N when NORM = 'I'; otherwise, WORK is not
> referenced.

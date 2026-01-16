```fortran
subroutine zlaqgb (
        integer m,
        integer n,
        integer kl,
        integer ku,
        complex*16, dimension( ldab, * ) ab,
        integer ldab,
        double precision, dimension( * ) r,
        double precision, dimension( * ) c,
        double precision rowcnd,
        double precision colcnd,
        double precision amax,
        character equed
)
```

ZLAQGB equilibrates a general M by N band matrix A with KL
subdiagonals and KU superdiagonals using the row and scaling factors
in the vectors R and C.

## Parameters
M : INTEGER [in]
> The number of rows of the matrix A.  M >= 0.

N : INTEGER [in]
> The number of columns of the matrix A.  N >= 0.

KL : INTEGER [in]
> The number of subdiagonals within the band of A.  KL >= 0.

KU : INTEGER [in]
> The number of superdiagonals within the band of A.  KU >= 0.

AB : COMPLEX\*16 array, dimension (LDAB,N) [in,out]
> On entry, the matrix A in band storage, in rows 1 to KL+KU+1.
> The j-th column of A is stored in the j-th column of the
> array AB as follows:
> AB(ku+1+i-j,j) = A(i,j) for max(1,j-ku)<=i<=min(m,j+kl)
> 
> On exit, the equilibrated matrix, in the same storage format
> as A.  See EQUED for the form of the equilibrated matrix.

LDAB : INTEGER [in]
> The leading dimension of the array AB.  LDA >= KL+KU+1.

R : DOUBLE PRECISION array, dimension (M) [in]
> The row scale factors for A.

C : DOUBLE PRECISION array, dimension (N) [in]
> The column scale factors for A.

ROWCND : DOUBLE PRECISION [in]
> Ratio of the smallest R(i) to the largest R(i).

COLCND : DOUBLE PRECISION [in]
> Ratio of the smallest C(i) to the largest C(i).

AMAX : DOUBLE PRECISION [in]
> Absolute value of largest matrix entry.

EQUED : CHARACTER\*1 [out]
> Specifies the form of equilibration that was done.
> = 'N':  No equilibration
> = 'R':  Row equilibration, i.e., A has been premultiplied by
> diag(R).
> = 'C':  Column equilibration, i.e., A has been postmultiplied
> by diag(C).
> = 'B':  Both row and column equilibration, i.e., A has been
> replaced by diag(R) \* A \* diag(C).

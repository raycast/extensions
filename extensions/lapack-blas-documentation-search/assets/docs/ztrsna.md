```fortran
subroutine ztrsna (
        character job,
        character howmny,
        logical, dimension( * ) select,
        integer n,
        complex*16, dimension( ldt, * ) t,
        integer ldt,
        complex*16, dimension( ldvl, * ) vl,
        integer ldvl,
        complex*16, dimension( ldvr, * ) vr,
        integer ldvr,
        double precision, dimension( * ) s,
        double precision, dimension( * ) sep,
        integer mm,
        integer m,
        complex*16, dimension( ldwork, * ) work,
        integer ldwork,
        double precision, dimension( * ) rwork,
        integer info
)
```

ZTRSNA estimates reciprocal condition numbers for specified
eigenvalues and/or right eigenvectors of a complex upper triangular
matrix T (or of any matrix Q\*T\*Q\*\*H with Q unitary).

## Parameters
JOB : CHARACTER\*1 [in]
> Specifies whether condition numbers are required for
> eigenvalues (S) or eigenvectors (SEP):
> = 'E': for eigenvalues only (S);
> = 'V': for eigenvectors only (SEP);
> = 'B': for both eigenvalues and eigenvectors (S and SEP).

HOWMNY : CHARACTER\*1 [in]
> = 'A': compute condition numbers for all eigenpairs;
> = 'S': compute condition numbers for selected eigenpairs
> specified by the array SELECT.

SELECT : LOGICAL array, dimension (N) [in]
> If HOWMNY = 'S', SELECT specifies the eigenpairs for which
> condition numbers are required. To select condition numbers
> for the j-th eigenpair, SELECT(j) must be set to .TRUE..
> If HOWMNY = 'A', SELECT is not referenced.

N : INTEGER [in]
> The order of the matrix T. N >= 0.

T : COMPLEX\*16 array, dimension (LDT,N) [in]
> The upper triangular matrix T.

LDT : INTEGER [in]
> The leading dimension of the array T. LDT >= max(1,N).

VL : COMPLEX\*16 array, dimension (LDVL,M) [in]
> If JOB = 'E' or 'B', VL must contain left eigenvectors of T
> (or of any Q\*T\*Q\*\*H with Q unitary), corresponding to the
> eigenpairs specified by HOWMNY and SELECT. The eigenvectors
> must be stored in consecutive columns of VL, as returned by
> ZHSEIN or ZTREVC.
> If JOB = 'V', VL is not referenced.

LDVL : INTEGER [in]
> The leading dimension of the array VL.
> LDVL >= 1; and if JOB = 'E' or 'B', LDVL >= N.

VR : COMPLEX\*16 array, dimension (LDVR,M) [in]
> If JOB = 'E' or 'B', VR must contain right eigenvectors of T
> (or of any Q\*T\*Q\*\*H with Q unitary), corresponding to the
> eigenpairs specified by HOWMNY and SELECT. The eigenvectors
> must be stored in consecutive columns of VR, as returned by
> ZHSEIN or ZTREVC.
> If JOB = 'V', VR is not referenced.

LDVR : INTEGER [in]
> The leading dimension of the array VR.
> LDVR >= 1; and if JOB = 'E' or 'B', LDVR >= N.

S : DOUBLE PRECISION array, dimension (MM) [out]
> If JOB = 'E' or 'B', the reciprocal condition numbers of the
> selected eigenvalues, stored in consecutive elements of the
> array. Thus S(j), SEP(j), and the j-th columns of VL and VR
> all correspond to the same eigenpair (but not in general the
> j-th eigenpair, unless all eigenpairs are selected).
> If JOB = 'V', S is not referenced.

SEP : DOUBLE PRECISION array, dimension (MM) [out]
> If JOB = 'V' or 'B', the estimated reciprocal condition
> numbers of the selected eigenvectors, stored in consecutive
> elements of the array.
> If JOB = 'E', SEP is not referenced.

MM : INTEGER [in]
> The number of elements in the arrays S (if JOB = 'E' or 'B')
> and/or SEP (if JOB = 'V' or 'B'). MM >= M.

M : INTEGER [out]
> The number of elements of the arrays S and/or SEP actually
> used to store the estimated condition numbers.
> If HOWMNY = 'A', M is set to N.

WORK : COMPLEX\*16 array, dimension (LDWORK,N+6) [out]
> If JOB = 'E', WORK is not referenced.

LDWORK : INTEGER [in]
> The leading dimension of the array WORK.
> LDWORK >= 1; and if JOB = 'V' or 'B', LDWORK >= N.

RWORK : DOUBLE PRECISION array, dimension (N) [out]
> If JOB = 'E', RWORK is not referenced.

INFO : INTEGER [out]
> = 0: successful exit
> < 0: if INFO = -i, the i-th argument had an illegal value
